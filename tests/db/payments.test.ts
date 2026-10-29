import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// next/server's after() needs a request scope; run tasks inline in tests.
vi.mock("next/server", () => ({ after: (task: () => unknown) => void task() }));

import { db } from "@/lib/db";
import { createBlock } from "@/lib/forms/blocks";
import { type BlockOf, formSchemaSchema } from "@/lib/forms/schema";
import { createCoupon, findValidCoupon } from "@/server/coupons";
import { createDraftForm, publishForm, saveDraft } from "@/server/forms";
import { verifyWebhookSignature } from "@/server/payments/razorpay";
import { encryptSecret } from "@/server/secrets";
import {
  confirmPayment,
  handleRazorpayWebhook,
  markPaid,
  submitForm,
} from "@/server/submissions";
import { ensureUserSetup } from "@/server/workspaces";

// The payment state machine against the real database, with Razorpay's HTTP
// API stubbed (no network, no real keys). Rows are deleted afterwards.

const owner = {
  id: randomUUID(),
  email: "pay-owner@example.test",
  name: "Owner",
};
const other = {
  id: randomUUID(),
  email: "pay-other@example.test",
  name: "Other",
};
const WEBHOOK_SECRET = "whsec_test_123456";
const KEY_SECRET = "test_key_secret_abcdef";
const runId = randomUUID().slice(0, 8);

let slug: string;
let versionId: string;
let emailId: string;
let paymentId: string;
let accountId: string;
let otherAccountId: string;
let freeSlug: string;
let freeVersion: string;
const createdOrders: string[] = [];

// Minimal fake Razorpay: orders echo the requested amount.
const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/v1/orders") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        amount: number;
        notes: Record<string, string>;
      };
      const id = `order_${runId}${createdOrders.length}`;
      createdOrders.push(id);
      return Response.json({
        id,
        amount: body.amount,
        amount_paid: 0,
        currency: "INR",
        receipt: null,
        status: "created",
        notes: body.notes,
      });
    }
    if (/\/v1\/orders\/[^/]+\/payments$/.test(url)) {
      return Response.json({ items: [] });
    }
    return new Response(
      JSON.stringify({ error: { description: "not mocked" } }),
      { status: 404 },
    );
  },
);

async function publish(user: typeof owner, blocks: unknown[], title: string) {
  const form = await createDraftForm(user);
  const before = await db.form.findUniqueOrThrow({
    where: { id: form.id },
    select: { updatedAt: true },
  });
  const draft = formSchemaSchema.parse({ title, blocks });
  const saved = await saveDraft(
    user,
    form.id,
    draft,
    before.updatedAt.toISOString(),
  );
  expect(saved.ok).toBe(true);
  const published = await publishForm(user, form.id);
  if (!published.ok) throw new Error(published.message);
  return {
    formId: form.id,
    slug: published.slug,
    versionId: published.versionId,
  };
}

beforeAll(async () => {
  vi.stubGlobal("fetch", fetchMock);
  const ws = await ensureUserSetup(owner);
  const otherWs = await ensureUserSetup(other);
  const account = await db.paymentAccount.create({
    data: {
      workspaceId: ws.id,
      provider: "razorpay",
      keyId: "rzp_test_abcdefgh12",
      secretEncrypted: encryptSecret(KEY_SECRET),
      webhookSecretEncrypted: encryptSecret(WEBHOOK_SECRET),
    },
  });
  accountId = account.id;
  const otherAccount = await db.paymentAccount.create({
    data: {
      workspaceId: otherWs.id,
      provider: "razorpay",
      keyId: "rzp_test_zzzzzzzz12",
      secretEncrypted: encryptSecret("other_secret_123"),
      webhookSecretEncrypted: encryptSecret("other_webhook_123"),
    },
  });
  otherAccountId = otherAccount.id;

  const email = { ...createBlock("email"), id: "email1" };
  const payment = {
    ...(createBlock("payment") as BlockOf<"payment">),
    id: "pay1",
    allowCoupons: true,
    pricing: {
      mode: "fixed" as const,
      amountMinor: 49900,
      itemLabel: "Ticket",
    },
  };
  emailId = email.id;
  paymentId = payment.id;
  const paid = await publish(owner, [email, payment], "Paid form");
  slug = paid.slug;
  versionId = paid.versionId;
  const free = await publish(
    owner,
    [{ ...createBlock("short_text"), id: "name1", required: true }],
    "Free form",
  );
  freeSlug = free.slug;
  freeVersion = free.versionId;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  const owners = [owner.id, other.id];
  // Payments block cascading deletes on purpose (money records), so remove them first.
  await db.payment.deleteMany({
    where: { submission: { form: { workspace: { ownerId: { in: owners } } } } },
  });
  await db.webhookEvent.deleteMany({
    where: { eventId: { startsWith: `evt_${runId}` } },
  });
  await db.workspace.deleteMany({ where: { ownerId: { in: owners } } });
  await db.profile.deleteMany({ where: { id: { in: owners } } });
  await db.$disconnect();
});

describe("free forms", () => {
  it("store a completed submission with no payment", async () => {
    const result = await submitForm({
      slug: freeSlug,
      versionId: freeVersion,
      answers: { name1: "Asha" },
    });
    expect(result).toMatchObject({ ok: true, status: "completed" });
  });

  it("reject answers for an outdated version", async () => {
    const result = await submitForm({
      slug: freeSlug,
      versionId: randomUUID(),
      answers: { name1: "Asha" },
    });
    expect(result).toMatchObject({ ok: false, reason: "reload" });
  });
});

describe("paid forms", () => {
  it("compute the amount on the server and ignore any client amount", async () => {
    const result = await submitForm({
      slug,
      versionId,
      answers: {
        [emailId]: "payer@example.test",
        [paymentId]: { amountMinor: 100 },
      },
    });
    expect(
      result.ok &&
        result.status === "pending_payment" &&
        result.checkout.amountMinor,
    ).toBe(49900);
    const sent = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
    expect(sent.amount).toBe(49900);
  });

  it("move to paid exactly once, however many times it's reported", async () => {
    const result = await submitForm({
      slug,
      versionId,
      answers: { [emailId]: "a@example.test" },
    });
    if (!result.ok || result.status !== "pending_payment")
      throw new Error("expected pending");
    const orderId = result.checkout.orderId;
    const first = await markPaid(orderId, {
      id: `pay_${runId}a`,
      amount: 49900,
      fee: 1180,
    });
    const again = await markPaid(orderId, {
      id: `pay_${runId}a`,
      amount: 49900,
      fee: 1180,
    });
    expect(first).toEqual({ changed: true, reason: "paid" });
    expect(again).toEqual({ changed: false, reason: "already" });
    const s = await db.submission.findUniqueOrThrow({
      where: { id: result.submissionId },
      select: { status: true },
    });
    expect(s.status).toBe("paid");
  });

  it("refuse to mark paid when Razorpay reports a different amount", async () => {
    const result = await submitForm({
      slug,
      versionId,
      answers: { [emailId]: "b@example.test" },
    });
    if (!result.ok || result.status !== "pending_payment")
      throw new Error("expected pending");
    const r = await markPaid(result.checkout.orderId, {
      id: `pay_${runId}b`,
      amount: 100,
      fee: 0,
    });
    expect(r.reason).toBe("amount_mismatch");
    const s = await db.submission.findUniqueOrThrow({
      where: { id: result.submissionId },
      select: { status: true },
    });
    expect(s.status).toBe("pending_payment");
  });

  it("reject a checkout callback with a forged signature", async () => {
    const result = await submitForm({
      slug,
      versionId,
      answers: { [emailId]: "c@example.test" },
    });
    if (!result.ok || result.status !== "pending_payment")
      throw new Error("expected pending");
    const r = await confirmPayment({
      submissionId: result.submissionId,
      orderId: result.checkout.orderId,
      paymentId: "pay_x",
      signature: "0".repeat(64),
    });
    expect(r).toEqual({ ok: false, status: "bad_signature" });
  });
});

describe("webhooks", () => {
  async function pendingOrder(email: string) {
    const result = await submitForm({
      slug,
      versionId,
      answers: { [emailId]: email },
    });
    if (!result.ok || result.status !== "pending_payment")
      throw new Error("expected pending");
    return result;
  }
  function delivery(
    orderId: string,
    paymentIdValue: string,
    account = accountId,
    secret = WEBHOOK_SECRET,
  ) {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentIdValue,
            order_id: orderId,
            amount: 49900,
            currency: "INR",
            status: "captured",
            fee: 1180,
          },
        },
      },
    });
    return {
      accountId: account,
      rawBody,
      signature: createHmac("sha256", secret).update(rawBody).digest("hex"),
      verify: verifyWebhookSignature,
    };
  }

  it("verify the signature, apply once and dedupe retries", async () => {
    const r = await pendingOrder("w1@example.test");
    const d = delivery(r.checkout.orderId, `pay_${runId}w1`);
    expect(
      await handleRazorpayWebhook({ ...d, eventId: `evt_${runId}1` }),
    ).toBe("processed");
    expect(
      await handleRazorpayWebhook({ ...d, eventId: `evt_${runId}1` }),
    ).toBe("duplicate");
    const s = await db.submission.findUniqueOrThrow({
      where: { id: r.submissionId },
      select: { status: true },
    });
    expect(s.status).toBe("paid");
  });

  it("reject a bad signature without touching anything", async () => {
    const r = await pendingOrder("w2@example.test");
    const d = delivery(
      r.checkout.orderId,
      `pay_${runId}w2`,
      accountId,
      "wrong-secret",
    );
    expect(
      await handleRazorpayWebhook({ ...d, eventId: `evt_${runId}2` }),
    ).toBe("bad_signature");
    const s = await db.submission.findUniqueOrThrow({
      where: { id: r.submissionId },
      select: { status: true },
    });
    expect(s.status).toBe("pending_payment");
  });

  it("ignore another workspace's account trying to settle this order", async () => {
    const r = await pendingOrder("w3@example.test");
    const d = delivery(
      r.checkout.orderId,
      `pay_${runId}w3`,
      otherAccountId,
      "other_webhook_123",
    );
    expect(
      await handleRazorpayWebhook({ ...d, eventId: `evt_${runId}3` }),
    ).toBe("ignored");
    const s = await db.submission.findUniqueOrThrow({
      where: { id: r.submissionId },
      select: { status: true },
    });
    expect(s.status).toBe("pending_payment");
  });
});

describe("coupons", () => {
  it("apply a 100% coupon without a payment and count its single use", async () => {
    const form = await db.form.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });
    const created = await createCoupon(owner, form.id, {
      code: "FREE",
      type: "percent",
      value: "100",
      maxUses: "1",
    });
    expect(created).toEqual({ ok: true });
    const result = await submitForm({
      slug,
      versionId,
      answers: {
        [emailId]: "free@example.test",
        [paymentId]: { couponCode: "free" },
      },
    });
    expect(result).toMatchObject({ ok: true, status: "completed" });
    expect(await findValidCoupon(form.id, "FREE")).toEqual({
      ok: false,
      message: "That code has been fully used",
    });
    const again = await submitForm({
      slug,
      versionId,
      answers: {
        [emailId]: "free2@example.test",
        [paymentId]: { couponCode: "FREE" },
      },
    });
    expect(again).toMatchObject({ ok: false, reason: "coupon" });
  });
});
