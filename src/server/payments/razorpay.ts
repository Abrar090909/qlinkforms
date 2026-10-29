import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay REST client using the owner's own keys (bring your own keys). No SDK:
// the few calls we need are plain HTTPS with basic auth. Docs:
// https://razorpay.com/docs/api/orders/ and /payments/

const API = "https://api.razorpay.com/v1";

export type RazorpayCredentials = { keyId: string; keySecret: string };

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function call<T>(
  creds: RazorpayCredentials,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString(
    "base64",
  );
  const response = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: { description?: string; code?: string };
  };
  if (!response.ok) {
    // Razorpay's error description never contains the secret.
    throw new RazorpayError(
      data.error?.description ?? `Razorpay returned ${response.status}`,
      response.status,
      data.error?.code,
    );
  }
  return data as T;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string>;
};

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  fee?: number | null;
  email?: string;
  contact?: string;
  method?: string;
  error_description?: string | null;
};

export function createOrder(
  creds: RazorpayCredentials,
  input: {
    amountMinor: number;
    receipt: string;
    notes: Record<string, string>;
  },
) {
  return call<RazorpayOrder>(creds, "/orders", {
    method: "POST",
    body: {
      amount: input.amountMinor,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
      // Capture immediately so "paid" means the money is the owner's.
      payment_capture: 1,
    },
  });
}

export function fetchOrder(creds: RazorpayCredentials, orderId: string) {
  return call<RazorpayOrder>(creds, `/orders/${encodeURIComponent(orderId)}`);
}

export async function fetchOrderPayments(
  creds: RazorpayCredentials,
  orderId: string,
) {
  const res = await call<{ items: RazorpayPayment[] }>(
    creds,
    `/orders/${encodeURIComponent(orderId)}/payments`,
  );
  return res.items;
}

/**
 * Check keys work without side effects: listing one order needs valid
 * credentials. Returns whether the key is a test-mode key.
 */
export async function verifyCredentials(creds: RazorpayCredentials) {
  await call(creds, "/orders?count=1");
  return { testMode: creds.keyId.startsWith("rzp_test_") };
}

function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Checkout success callback: HMAC(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(
  input: { orderId: string; paymentId: string; signature: string },
  keySecret: string,
) {
  return safeEqualHex(
    hmacHex(keySecret, `${input.orderId}|${input.paymentId}`),
    input.signature,
  );
}

/** Webhooks: HMAC(raw body, webhook secret), sent as X-Razorpay-Signature. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
) {
  return safeEqualHex(hmacHex(webhookSecret, rawBody), signature);
}
