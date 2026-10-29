import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type Answers,
  type AnswerValue,
  displayAnswer,
} from "@/lib/forms/answers";
import type { PriceBreakdown } from "@/lib/forms/pricing";
import {
  type Block,
  type FormSchema,
  parseFormSchema,
} from "@/lib/forms/schema";
import { formatPaise } from "@/lib/money";
import { draftOf, getFormForUser } from "@/server/forms";
import { receiptNumber } from "@/server/submissions";

// Responses for the owner. Each submission is shown with its own form version's
// labels, so editing a question later never relabels old answers.

export const RESPONSE_STATUSES = [
  "completed",
  "paid",
  "pending_payment",
  "payment_failed",
] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];
const PAGE_SIZE = 50;

export type ResponseFilter = {
  q?: string;
  status?: ResponseStatus;
  page?: number;
};

function whereFor(
  formId: string,
  filter: ResponseFilter,
): Prisma.SubmissionWhereInput {
  const where: Prisma.SubmissionWhereInput = { formId };
  if (filter.status) where.status = filter.status;
  return where;
}

async function versionsOf(formId: string) {
  const versions = await db.formVersion.findMany({
    where: { formId },
    orderBy: { createdAt: "asc" },
    select: { id: true, schemaJson: true },
  });
  const byId = new Map<string, FormSchema>();
  for (const v of versions) {
    const parsed = parseFormSchema(v.schemaJson);
    if (parsed.success) byId.set(v.id, parsed.data);
  }
  return {
    byId,
    latest: versions.length
      ? byId.get(versions[versions.length - 1]!.id)
      : undefined,
  };
}

/** Columns: every answerable block across versions, latest order first. */
function columnsFor(
  latest: FormSchema | undefined,
  all: Map<string, FormSchema>,
) {
  const columns: Block[] = [];
  const seen = new Set<string>();
  const add = (b: Block) => {
    if (b.type === "statement" || b.type === "payment" || seen.has(b.id))
      return;
    seen.add(b.id);
    columns.push(b);
  };
  latest?.blocks.forEach(add);
  for (const schema of all.values()) schema.blocks.forEach(add);
  return columns;
}

function textFor(
  schema: FormSchema | undefined,
  fallback: Block,
  value: AnswerValue | undefined,
) {
  const block = schema?.blocks.find((b) => b.id === fallback.id) ?? fallback;
  return displayAnswer(block, value);
}

/** Search answers and email with a plain substring match (escaped for LIKE). */
async function searchIds(formId: string, q: string) {
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db.$queryRaw<{ id: string }[]>`
    select id from public.submissions
    where form_id = ${formId}::uuid
      and (answers_json::text ilike ${pattern} or coalesce(respondent_email, '') ilike ${pattern})
    limit 5000`;
  return rows.map((r) => r.id);
}

export async function listResponses(
  user: SessionUser,
  formId: string,
  filter: ResponseFilter,
) {
  const form = await getFormForUser(user, formId);
  if (!form) return null;
  const where = whereFor(formId, filter);
  const q = filter.q?.trim().slice(0, 100);
  if (q) where.id = { in: await searchIds(formId, q) };
  const page = Math.max(1, Math.min(10_000, filter.page ?? 1));

  const [{ byId, latest }, total, rows, totals] = await Promise.all([
    versionsOf(formId),
    db.submission.count({ where }),
    db.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        amountMinor: true,
        createdAt: true,
        formVersionId: true,
        answersJson: true,
        pricingJson: true,
        respondentEmail: true,
        payments: {
          select: { providerPaymentId: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    db.submission.groupBy({
      by: ["status"],
      where: { formId },
      _count: { _all: true },
      _sum: { amountMinor: true },
    }),
  ]);
  const schema = latest ?? draftOf(form);
  const columns = columnsFor(latest, byId);

  return {
    form: {
      id: form.id,
      title: form.title,
      slug: form.slug,
      status: form.status,
      hasPayment: schema.blocks.some((b) => b.type === "payment"),
    },
    columns: columns.map((c) => ({ id: c.id, label: c.label })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    summary: {
      responses: totals
        .filter((t) => t.status === "completed" || t.status === "paid")
        .reduce((n, t) => n + t._count._all, 0),
      paidMinor: totals.find((t) => t.status === "paid")?._sum.amountMinor ?? 0,
      pending:
        totals.find((t) => t.status === "pending_payment")?._count._all ?? 0,
    },
    rows: rows.map((r) => {
      const version = byId.get(r.formVersionId);
      const answers = r.answersJson as Answers;
      return {
        id: r.id,
        receipt: receiptNumber(r.id),
        status: r.status,
        amountMinor: r.amountMinor,
        createdAt: r.createdAt.toISOString(),
        email: r.respondentEmail,
        paymentId: r.payments[0]?.providerPaymentId ?? null,
        breakdown: (r.pricingJson as PriceBreakdown | null) ?? null,
        cells: Object.fromEntries(
          columns.map((c) => [c.id, textFor(version, c, answers[c.id])]),
        ),
      };
    }),
  };
}

export type ResponsesPage = NonNullable<
  Awaited<ReturnType<typeof listResponses>>
>;

const statusLabel: Record<ResponseStatus, string> = {
  completed: "Submitted",
  paid: "Paid",
  pending_payment: "Pending payment",
  payment_failed: "Payment failed",
};

/** All responses as rows for CSV (capped at 20,000). Audited. */
export async function exportResponses(user: SessionUser, formId: string) {
  const form = await getFormForUser(user, formId);
  if (!form) return null;
  const [{ byId, latest }, rows] = await Promise.all([
    versionsOf(formId),
    db.submission.findMany({
      where: { formId },
      orderBy: { createdAt: "asc" },
      take: 20_000,
      select: {
        id: true,
        status: true,
        amountMinor: true,
        createdAt: true,
        formVersionId: true,
        answersJson: true,
        pricingJson: true,
        payments: {
          select: { providerPaymentId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);
  const columns = columnsFor(latest, byId);
  const header = [
    "Receipt",
    "Submitted at (IST)",
    "Status",
    "Amount (₹)",
    "Items",
    "Coupon",
    "Razorpay payment ID",
    ...columns.map((c) => c.label),
  ];
  const ist = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const body = rows.map((r) => {
    const answers = r.answersJson as Answers;
    const breakdown = r.pricingJson as PriceBreakdown | null;
    const version = byId.get(r.formVersionId);
    return [
      receiptNumber(r.id),
      ist.format(r.createdAt),
      statusLabel[r.status],
      r.amountMinor ? formatPaise(r.amountMinor).replace("₹", "") : "",
      breakdown?.lines
        .map((l) => `${l.label}${l.quantity > 1 ? ` x${l.quantity}` : ""}`)
        .join("; ") ?? "",
      breakdown?.couponCode ?? "",
      r.payments[0]?.providerPaymentId ?? "",
      ...columns.map((c) => textFor(version, c, answers[c.id])),
    ];
  });
  await db.auditLog.create({
    data: {
      workspaceId: form.workspaceId,
      actorId: user.id,
      action: "responses.exported",
      metaJson: { formId, rows: rows.length },
    },
  });
  return { title: form.title, rows: [header, ...body] };
}

/** Delete one response (not allowed once it has a payment record). */
export async function deleteResponse(
  user: SessionUser,
  formId: string,
  submissionId: string,
) {
  const form = await getFormForUser(user, formId);
  if (!form) return { ok: false as const, message: "Form not found" };
  const payments = await db.payment.count({ where: { submissionId } });
  if (payments > 0)
    return {
      ok: false as const,
      message: "Responses with a payment are kept for your records.",
    };
  const deleted = await db.submission.deleteMany({
    where: { id: submissionId, formId },
  });
  if (deleted.count) {
    await db.auditLog.create({
      data: {
        workspaceId: form.workspaceId,
        actorId: user.id,
        action: "response.deleted",
        metaJson: { formId, submissionId },
      },
    });
  }
  return deleted.count > 0
    ? { ok: true as const }
    : { ok: false as const, message: "Response not found" };
}
