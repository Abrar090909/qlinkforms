"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { Answers } from "@/lib/forms/answers";
import { findValidCoupon } from "@/server/coupons";
import { getPublishedForm } from "@/server/forms";
import { clientIp, rateLimit } from "@/server/rate-limit";
import {
  confirmPayment,
  type SubmitResult,
  submitForm,
} from "@/server/submissions";

// Public, unauthenticated endpoints. Every input is validated here and again
// in the services; rate limits stop floods per IP and per form.

const submitInput = z.object({
  slug: z.string().min(1).max(60),
  versionId: z.uuid(),
  answers: z.record(z.string().max(16), z.unknown()),
  // Honeypot: a hidden field people never fill in. Bots do.
  website: z.string().max(0).optional(),
});

async function limited(key: string, limit: number, seconds: number) {
  const ip = clientIp(await headers());
  const { allowed } = await rateLimit(`${key}:${ip}`, limit, seconds);
  return !allowed;
}

export async function submitAction(input: unknown): Promise<SubmitResult> {
  const parsed = submitInput.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      reason: "error",
      message: "Something went wrong. Reload and try again.",
    };
  if (parsed.data.website) {
    // Refuse quietly; a bot gets the same generic error as anything malformed.
    return {
      ok: false,
      reason: "error",
      message: "Something went wrong. Reload and try again.",
    };
  }
  // Generous per IP: a whole college can share one Wi-Fi address at a fest.
  if (await limited(`submit:${parsed.data.slug}`, 60, 600)) {
    return {
      ok: false,
      reason: "error",
      message: "Too many attempts. Wait a few minutes and try again.",
    };
  }
  return submitForm({
    slug: parsed.data.slug,
    versionId: parsed.data.versionId,
    answers: parsed.data.answers as Answers,
  });
}

export async function couponAction(input: unknown) {
  const parsed = z
    .object({ slug: z.string().min(1).max(60), code: z.string().max(40) })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false as const, message: "That code isn't valid" };
  if (await limited(`coupon:${parsed.data.slug}`, 60, 600)) {
    return {
      ok: false as const,
      message: "Too many attempts. Try again later.",
    };
  }
  const form = await getPublishedForm(parsed.data.slug);
  if (!form) return { ok: false as const, message: "That code isn't valid" };
  return findValidCoupon(form.id, parsed.data.code);
}

const confirmInput = z.object({
  submissionId: z.uuid(),
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function confirmAction(input: unknown) {
  const parsed = confirmInput.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, status: "unknown" as const };
  try {
    return await confirmPayment(parsed.data);
  } catch {
    // Razorpay unreachable: the receipt page and webhook will settle it.
    return { ok: true as const, status: "pending" as const };
  }
}
