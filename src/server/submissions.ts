import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import {
  type Answers,
  displayAnswer,
  validateAnswers,
  visibleBlockIds,
} from "@/lib/forms/answers";
import {
  type AppliedCoupon,
  computePrice,
  type PaymentAnswer,
  type PriceBreakdown,
} from "@/lib/forms/pricing";
import { findPaymentBlock, type FormSchema } from "@/lib/forms/schema";
import { formatPaise } from "@/lib/money";
import { findValidCoupon, redeemCoupon } from "@/server/coupons";
import { emailLayout, escapeHtml, sendEmail } from "@/server/email";
import { getPublishedForm } from "@/server/forms";
import {
  type ActiveAccount,
  getAccountById,
  getActiveAccount,
  markAccountInvalid,
} from "@/server/payments/accounts";
import {
  createOrder,
  fetchOrderPayments,
  RazorpayError,
  type RazorpayPayment,
  verifyPaymentSignature,
} from "@/server/payments/razorpay";

// Submission and payment state machine (technical plan section 5):
//   submission: completed (free) | pending_payment -> paid | payment_failed
//   payment:    created -> captured | failed
// Webhooks are the source of truth; the browser callback is a fast path. Every
// transition is a conditional update, so duplicates and out-of-order events
// are harmless.

/**
 * Run work after the response is sent (emails), so a slow mail API never
 * delays the respondent. Outside a request (tests, scripts) just start it.
 */
function runAfter(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    void task();
  }
}

/** Short, human-friendly receipt number derived from the submission id. */
export function receiptNumber(submissionId: string) {
  return `R-${submissionId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export type SubmitInput = {
  slug: string;
  versionId: string;
  answers: Answers;
};

export type SubmitResult =
  | { ok: true; submissionId: string; status: "completed" }
  | {
      ok: true;
      submissionId: string;
      status: "pending_payment";
      checkout: {
        keyId: string;
        orderId: string;
        amountMinor: number;
        currency: "INR";
        name: string;
        description: string;
        prefill: { name?: string; email?: string; contact?: string };
      };
    }
  | { ok: false; reason: "invalid"; errors: Record<string, string> }
  | { ok: false; reason: "coupon"; message: string }
  | {
      ok: false;
      reason:
        "reload" | "closed" | "not_found" | "payments_unavailable" | "error";
      message: string;
    };

function firstAnswerOfType(
  schema: FormSchema,
  answers: Answers,
  type: "email" | "phone" | "short_text",
) {
  const block = schema.blocks.find(
    (b) => b.type === type && typeof answers[b.id] === "string",
  );
  return block ? (answers[block.id] as string) : undefined;
}

export async function submitForm(input: SubmitInput): Promise<SubmitResult> {
  const form = await getPublishedForm(input.slug);
  if (!form)
    return {
      ok: false,
      reason: "not_found",
      message: "This form isn't available.",
    };
  if (form.schema.settings.closed) {
    return {
      ok: false,
      reason: "closed",
      message: form.schema.settings.closedMessage,
    };
  }
  // Answers are bound to the version the respondent saw. If the owner
  // republished meanwhile, ask for a reload rather than guess.
  if (input.versionId !== form.versionId) {
    return {
      ok: false,
      reason: "reload",
      message:
        "This form was just updated. Reload the page to see the latest version.",
    };
  }

  const validated = validateAnswers(form.schema, input.answers);
  if (!validated.ok)
    return { ok: false, reason: "invalid", errors: validated.errors };
  const answers = validated.answers;

  // Server-side price from the stored schema (CLAUDE.md rule 2).
  const paymentBlock = findPaymentBlock(form.schema);
  let breakdown: PriceBreakdown | null = null;
  if (
    paymentBlock &&
    visibleBlockIds(form.schema, answers).has(paymentBlock.id) &&
    answers[paymentBlock.id]
  ) {
    const paymentAnswer = answers[paymentBlock.id] as PaymentAnswer;
    let coupon: AppliedCoupon | null = null;
    if (paymentAnswer.couponCode && paymentBlock.allowCoupons) {
      const found = await findValidCoupon(form.id, paymentAnswer.couponCode);
      if (!found.ok)
        return { ok: false, reason: "coupon", message: found.message };
      coupon = found.coupon;
    }
    const price = computePrice(paymentBlock, paymentAnswer, coupon);
    if (!price.ok)
      return {
        ok: false,
        reason: "invalid",
        errors: { [paymentBlock.id]: price.error },
      };
    breakdown = price.breakdown;
  }

  const email = firstAnswerOfType(form.schema, answers, "email");
  const total = breakdown?.totalMinor ?? 0;
  const base = {
    formId: form.id,
    formVersionId: form.versionId,
    answersJson: answers as Prisma.InputJsonValue,
    amountMinor: total,
    pricingJson: (breakdown ?? undefined) as Prisma.InputJsonValue | undefined,
    respondentEmail: email ?? null,
  };

  if (total === 0) {
    const submission = await db.$transaction(async (tx) => {
      const s = await tx.submission.create({
        data: { ...base, status: "completed" },
        select: { id: true },
      });
      if (breakdown?.couponCode)
        await redeemCoupon(tx, form.id, breakdown.couponCode);
      return s;
    });
    runAfter(() => notifyCompleted(submission.id));
    return { ok: true, submissionId: submission.id, status: "completed" };
  }

  const account = await getActiveAccount(form.workspaceId);
  if (!account) {
    return {
      ok: false,
      reason: "payments_unavailable",
      message:
        "Payments for this form aren't set up yet. Please contact the organiser.",
    };
  }

  const submission = await db.submission.create({
    data: { ...base, status: "pending_payment" },
    select: { id: true },
  });
  let order;
  try {
    order = await createOrder(account.creds, {
      amountMinor: total,
      receipt: receiptNumber(submission.id),
      notes: { submission_id: submission.id, form_id: form.id },
    });
  } catch (error) {
    await db.submission.update({
      where: { id: submission.id },
      data: { status: "payment_failed" },
    });
    if (error instanceof RazorpayError && error.status === 401) {
      // Owner revoked or rotated keys: stop taking payments until they reconnect.
      await markAccountInvalid(account.id);
    }
    console.error("createOrder failed", {
      submissionId: submission.id,
      status: error instanceof RazorpayError ? error.status : null,
    });
    return {
      ok: false,
      reason: "payments_unavailable",
      message: "We couldn't start the payment. Please try again in a minute.",
    };
  }
  if (order.amount !== total) {
    // Should be impossible; never let the respondent pay a different amount.
    await db.submission.update({
      where: { id: submission.id },
      data: { status: "payment_failed" },
    });
    return {
      ok: false,
      reason: "error",
      message: "Something went wrong. Please try again.",
    };
  }
  await db.payment.create({
    data: {
      submissionId: submission.id,
      provider: "razorpay",
      providerOrderId: order.id,
      amountMinor: total,
      status: "created",
    },
  });

  const name = firstAnswerOfType(form.schema, answers, "short_text");
  const contact = firstAnswerOfType(form.schema, answers, "phone");
  return {
    ok: true,
    submissionId: submission.id,
    status: "pending_payment",
    checkout: {
      keyId: account.creds.keyId,
      orderId: order.id,
      amountMinor: total,
      currency: "INR",
      name: form.schema.title.slice(0, 60),
      description:
        breakdown?.lines
          .map((l) => l.label)
          .join(", ")
          .slice(0, 250) ?? "",
      prefill: { name, email, contact: contact?.replace(/^\+91/, "") },
    },
  };
}

async function accountForPayment(payment: {
  submission: { form: { workspaceId: string } };
}) {
  return getActiveAccount(payment.submission.form.workspaceId);
}

const paymentWithContext = {
  id: true,
  status: true,
  amountMinor: true,
  providerOrderId: true,
  submissionId: true,
  submission: {
    select: {
      id: true,
      status: true,
      formId: true,
      pricingJson: true,
      form: { select: { workspaceId: true } },
    },
  },
} as const;

/**
 * Move a payment to captured and its submission to paid, exactly once. Safe to
 * call from the browser callback, the webhook and reconciliation in any order.
 */
export async function markPaid(
  orderId: string,
  rz: Pick<RazorpayPayment, "id" | "amount" | "fee"> & { raw?: unknown },
) {
  const payment = await db.payment.findUnique({
    where: { providerOrderId: orderId },
    select: paymentWithContext,
  });
  if (!payment) return { changed: false, reason: "unknown_order" as const };
  if (rz.amount !== payment.amountMinor) {
    await db.auditLog.create({
      data: {
        workspaceId: payment.submission.form.workspaceId,
        action: "payment.amount_mismatch",
        metaJson: {
          orderId,
          expected: payment.amountMinor,
          received: rz.amount,
        },
      },
    });
    return { changed: false, reason: "amount_mismatch" as const };
  }
  const changed = await db.$transaction(async (tx) => {
    const p = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "captured" } },
      data: {
        status: "captured",
        providerPaymentId: rz.id,
        feeMinor: rz.fee ?? null,
        rawJson: (rz.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    if (p.count === 0) return false;
    const s = await tx.submission.updateMany({
      where: {
        id: payment.submissionId,
        status: { in: ["pending_payment", "payment_failed"] },
      },
      data: { status: "paid" },
    });
    const code = (payment.submission.pricingJson as PriceBreakdown | null)
      ?.couponCode;
    if (s.count === 1 && code) {
      const redeemed = await redeemCoupon(tx, payment.submission.formId, code);
      if (!redeemed) {
        await tx.auditLog.create({
          data: {
            workspaceId: payment.submission.form.workspaceId,
            action: "coupon.overused",
            metaJson: { code, orderId },
          },
        });
      }
    }
    return s.count === 1;
  });
  if (changed) runAfter(() => notifyCompleted(payment.submissionId));
  return {
    changed,
    reason: changed ? ("paid" as const) : ("already" as const),
  };
}

/** Mark a payment failed unless it was already captured. */
export async function markFailed(orderId: string, reason: string) {
  const payment = await db.payment.findUnique({
    where: { providerOrderId: orderId },
    select: { id: true, submissionId: true },
  });
  if (!payment) return false;
  return db.$transaction(async (tx) => {
    const p = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["created", "authorized"] } },
      data: { status: "failed", rawJson: { failure: reason.slice(0, 300) } },
    });
    if (p.count === 0) return false;
    await tx.submission.updateMany({
      where: { id: payment.submissionId, status: "pending_payment" },
      data: { status: "payment_failed" },
    });
    return true;
  });
}

export type ConfirmInput = {
  submissionId: string;
  orderId: string;
  paymentId: string;
  signature: string;
};

/** Browser callback after Checkout succeeds: verify, then ask Razorpay. */
export async function confirmPayment(input: ConfirmInput) {
  const payment = await db.payment.findUnique({
    where: { providerOrderId: input.orderId },
    select: paymentWithContext,
  });
  if (!payment || payment.submissionId !== input.submissionId)
    return { ok: false as const, status: "unknown" as const };
  const account = await accountForPayment(payment);
  if (!account) return { ok: false as const, status: "unknown" as const };
  if (!verifyPaymentSignature(input, account.creds.keySecret)) {
    return { ok: false as const, status: "bad_signature" as const };
  }
  // The signature proves Checkout finished; the API tells us the money state.
  const status = await syncOrder(account, input.orderId);
  return { ok: true as const, status };
}

/** Pull an order's payments from Razorpay and apply them. */
async function syncOrder(account: ActiveAccount, orderId: string) {
  const payments = await fetchOrderPayments(account.creds, orderId);
  const captured = payments.find((p) => p.status === "captured");
  if (captured) {
    await markPaid(orderId, {
      id: captured.id,
      amount: captured.amount,
      fee: captured.fee,
      raw: captured,
    });
    return "paid" as const;
  }
  if (payments.some((p) => p.status === "authorized" || p.status === "created"))
    return "pending" as const;
  if (payments.length > 0 && payments.every((p) => p.status === "failed"))
    return "failed_attempts" as const;
  return "pending" as const;
}

export type PublicStatus = {
  status: "completed" | "pending_payment" | "paid" | "payment_failed";
  receipt: string;
  amountMinor: number;
  breakdown: PriceBreakdown | null;
};

/**
 * Status for the respondent's receipt page. Pending payments are re-checked
 * with Razorpay (UPI can take minutes; the webhook may not have arrived).
 */
export async function getPublicStatus(
  slug: string,
  submissionId: string,
): Promise<PublicStatus | null> {
  const submission = await db.submission.findFirst({
    where: { id: submissionId, form: { slug } },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      pricingJson: true,
      createdAt: true,
      form: { select: { workspaceId: true } },
      payments: {
        select: { providerOrderId: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!submission) return null;
  let status = submission.status;
  if (status === "pending_payment" && submission.payments[0]) {
    const account = await getActiveAccount(submission.form.workspaceId);
    if (account) {
      try {
        const synced = await syncOrder(
          account,
          submission.payments[0].providerOrderId,
        );
        if (synced === "paid") status = "paid";
      } catch {
        // Razorpay unreachable: show pending, the webhook will settle it.
      }
    }
  }
  return {
    status,
    receipt: receiptNumber(submission.id),
    amountMinor: submission.amountMinor,
    breakdown: (submission.pricingJson as PriceBreakdown | null) ?? null,
  };
}

/** Razorpay webhook entities we act on. */
type WebhookPayload = {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?: { entity?: { id: string } };
  };
};

export type WebhookOutcome =
  "processed" | "duplicate" | "ignored" | "bad_signature" | "unknown_account";

/**
 * Handle one webhook delivery. Signature first, then dedupe on the event id
 * (Razorpay retries), then apply idempotently. The payment's form must belong
 * to the account's workspace, so one owner's webhook can't touch another's data.
 */
export async function handleRazorpayWebhook(input: {
  accountId: string;
  rawBody: string;
  signature: string | null;
  eventId: string | null;
  verify: (raw: string, sig: string, secret: string) => boolean;
}): Promise<WebhookOutcome> {
  const account = await getAccountById(input.accountId).catch(() => null);
  if (!account || !account.webhookSecret) return "unknown_account";
  if (
    !input.signature ||
    !input.verify(input.rawBody, input.signature, account.webhookSecret)
  ) {
    return "bad_signature";
  }
  const payload = JSON.parse(input.rawBody) as WebhookPayload;
  const eventId =
    input.eventId ??
    `${payload.event}:${payload.payload?.payment?.entity?.id ?? payload.payload?.order?.entity?.id}`;

  const existing = await db.webhookEvent.findUnique({
    where: { eventId },
    select: { processedAt: true },
  });
  if (existing?.processedAt) return "duplicate";
  if (!existing) {
    try {
      await db.webhookEvent.create({
        data: {
          provider: "razorpay",
          eventId,
          payloadJson: payload as unknown as Prisma.InputJsonValue,
        },
      });
    } catch {
      return "duplicate"; // a concurrent delivery got there first
    }
  }

  const entity = payload.payload?.payment?.entity;
  const orderId = entity?.order_id ?? payload.payload?.order?.entity?.id;
  let outcome: WebhookOutcome = "ignored";
  if (orderId) {
    const payment = await db.payment.findUnique({
      where: { providerOrderId: orderId },
      select: paymentWithContext,
    });
    if (
      payment &&
      payment.submission.form.workspaceId === account.workspaceId
    ) {
      if (
        (payload.event === "payment.captured" ||
          payload.event === "order.paid") &&
        entity
      ) {
        await markPaid(orderId, {
          id: entity.id,
          amount: entity.amount,
          fee: entity.fee,
          raw: entity,
        });
        outcome = "processed";
      } else if (payload.event === "order.paid") {
        await syncOrder(account, orderId);
        outcome = "processed";
      } else if (payload.event === "payment.failed") {
        // A failed attempt; the respondent may retry within the same order, so
        // only fail if nothing has been captured.
        const status = await syncOrder(account, orderId);
        if (status === "failed_attempts")
          await markFailed(orderId, entity?.error_description ?? "failed");
        outcome = "processed";
      }
    }
  }
  await db.webhookEvent.update({
    where: { eventId },
    data: { processedAt: new Date() },
  });
  return outcome;
}

/**
 * Reconciliation (cron): settle payments still "created" after a few minutes,
 * in case both the callback and the webhook were lost. Orders older than a day
 * with nothing captured are marked failed.
 */
export async function reconcilePendingPayments({ limit = 50 } = {}) {
  const now = Date.now();
  const pending = await db.payment.findMany({
    where: {
      status: { in: ["created", "authorized"] },
      createdAt: {
        lt: new Date(now - 5 * 60_000),
        gt: new Date(now - 7 * 24 * 3_600_000),
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      providerOrderId: true,
      createdAt: true,
      submission: { select: { form: { select: { workspaceId: true } } } },
    },
  });
  const summary = { checked: 0, paid: 0, failed: 0, errors: 0 };
  for (const p of pending) {
    summary.checked++;
    try {
      const account = await getActiveAccount(p.submission.form.workspaceId);
      if (!account) continue;
      const status = await syncOrder(account, p.providerOrderId);
      if (status === "paid") summary.paid++;
      else if (now - p.createdAt.getTime() > 24 * 3_600_000) {
        if (await markFailed(p.providerOrderId, "expired")) summary.failed++;
      }
    } catch {
      summary.errors++;
    }
  }
  return summary;
}

/** Receipt to the respondent and a heads-up to the owner. Never throws. */
async function notifyCompleted(submissionId: string) {
  try {
    const s = await db.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        status: true,
        amountMinor: true,
        pricingJson: true,
        respondentEmail: true,
        answersJson: true,
        formVersion: { select: { schemaJson: true } },
        form: {
          select: {
            id: true,
            title: true,
            workspace: { select: { owner: { select: { email: true } } } },
          },
        },
      },
    });
    if (!s) return;
    const schema = s.formVersion.schemaJson as unknown as FormSchema;
    const answers = s.answersJson as Answers;
    const breakdown = s.pricingJson as PriceBreakdown | null;
    const receipt = receiptNumber(s.id);
    const paidLine =
      s.status === "paid"
        ? `<p style="font-size:16px"><strong>Paid ${escapeHtml(formatPaise(s.amountMinor))}</strong></p>`
        : "";
    const linesHtml = breakdown
      ? `<table style="width:100%;border-collapse:collapse;font-size:14px">${breakdown.lines
          .map(
            (l) =>
              `<tr><td style="padding:4px 0">${escapeHtml(l.label)}${l.quantity > 1 ? ` × ${l.quantity}` : ""}</td><td style="text-align:right">${escapeHtml(formatPaise(l.totalMinor))}</td></tr>`,
          )
          .join(
            "",
          )}${breakdown.discountMinor ? `<tr><td>Discount (${escapeHtml(breakdown.couponCode ?? "")})</td><td style="text-align:right">-${escapeHtml(formatPaise(breakdown.discountMinor))}</td></tr>` : ""}</table>`
      : "";

    if (s.respondentEmail) {
      await sendEmail({
        to: s.respondentEmail,
        subject:
          s.status === "paid"
            ? `Payment received: ${schema.title}`
            : `Response received: ${schema.title}`,
        html: emailLayout(
          schema.settings.thankYouTitle || "Thank you!",
          `<p>${escapeHtml(schema.settings.thankYouMessage)}</p>${paidLine}${linesHtml}<p style="color:#655d67;font-size:13px">Receipt number: ${receipt}</p>`,
        ),
        text: `${schema.settings.thankYouMessage}\n${s.status === "paid" ? `Paid ${formatPaise(s.amountMinor)}\n` : ""}Receipt number: ${receipt}`,
      });
    }
    const ownerEmail = s.form.workspace.owner.email;
    if (ownerEmail) {
      const rows = schema.blocks
        .filter(
          (b) =>
            b.type !== "statement" &&
            b.type !== "payment" &&
            answers[b.id] !== undefined,
        )
        .map(
          (b) =>
            `<tr><td style="padding:4px 8px 4px 0;color:#655d67;vertical-align:top">${escapeHtml(b.label)}</td><td style="padding:4px 0">${escapeHtml(displayAnswer(b, answers[b.id]))}</td></tr>`,
        )
        .join("");
      const link = `${serverEnv.SITE_URL}/forms/${s.form.id}/responses`;
      await sendEmail({
        to: ownerEmail,
        subject: `${s.status === "paid" ? `₹ New payment ${formatPaise(s.amountMinor)}` : "New response"}: ${schema.title}`,
        html: emailLayout(
          `New response on ${schema.title}`,
          `${paidLine}<table style="font-size:14px">${rows}</table><p><a href="${escapeHtml(link)}">View all responses</a></p><p style="color:#655d67;font-size:13px">${receipt}</p>`,
        ),
        text: `New response on ${schema.title}. ${link}`,
        replyTo: s.respondentEmail ?? undefined,
      });
    }
  } catch (error) {
    console.error("notifyCompleted failed", {
      submissionId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
