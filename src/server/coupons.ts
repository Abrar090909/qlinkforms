import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AppliedCoupon } from "@/lib/forms/pricing";
import { rupeesToPaise } from "@/lib/money";
import { getFormForUser } from "@/server/forms";

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,40}$/, "Use 2 to 40 letters, numbers, - or _"),
    type: z.enum(["percent", "fixed"]),
    /** Percent as typed ("10", "12.5") or rupees as typed ("100"). */
    value: z.string().trim().min(1, "Enter a value"),
    maxUses: z.coerce.number().int().min(1).max(1_000_000).optional(),
    expiresAt: z.string().optional(),
  })
  .transform((input, ctx) => {
    let value: number;
    if (input.type === "percent") {
      const pct = /^\d{1,3}(?:\.\d{1,2})?$/.test(input.value)
        ? Number(input.value)
        : NaN;
      if (!(pct > 0 && pct <= 100)) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Enter a percentage from 0.01 to 100",
        });
        return z.NEVER;
      }
      // Basis points, computed from digits so 12.5% is exactly 1250.
      const [whole, frac = ""] = input.value.split(".");
      value = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
    } else {
      const paise = rupeesToPaise(input.value);
      if (!paise) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Enter an amount in rupees",
        });
        return z.NEVER;
      }
      value = paise;
    }
    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      // A date picker gives YYYY-MM-DD: valid until the end of that day in India.
      const d = new Date(`${input.expiresAt}T23:59:59+05:30`);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["expiresAt"],
          message: "Enter a valid date",
        });
        return z.NEVER;
      }
      expiresAt = d;
    }
    return {
      code: input.code,
      type: input.type,
      value,
      maxUses: input.maxUses ?? null,
      expiresAt,
    };
  });

export async function listCoupons(user: SessionUser, formId: string) {
  const form = await getFormForUser(user, formId);
  if (!form) return null;
  return db.coupon.findMany({
    where: { formId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      maxUses: true,
      used: true,
      expiresAt: true,
    },
  });
}

export async function createCoupon(
  user: SessionUser,
  formId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const form = await getFormForUser(user, formId);
  if (!form) return { ok: false, message: "Form not found" };
  const parsed = couponInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the coupon",
    };
  const exists = await db.coupon.findUnique({
    where: { formId_code: { formId, code: parsed.data.code } },
    select: { id: true },
  });
  if (exists)
    return { ok: false, message: "A coupon with that code already exists" };
  await db.$transaction(async (tx) => {
    await tx.coupon.create({ data: { formId, ...parsed.data } });
    await tx.auditLog.create({
      data: {
        workspaceId: form.workspaceId,
        actorId: user.id,
        action: "coupon.created",
        metaJson: { formId, code: parsed.data.code },
      },
    });
  });
  return { ok: true };
}

export async function deleteCoupon(
  user: SessionUser,
  formId: string,
  couponId: string,
) {
  const form = await getFormForUser(user, formId);
  if (!form) return false;
  const deleted = await db.coupon.deleteMany({
    where: { id: couponId, formId },
  });
  return deleted.count > 0;
}

export type CouponLookup =
  { ok: true; coupon: AppliedCoupon } | { ok: false; message: string };

/** Is this code usable right now on this form? */
export async function findValidCoupon(
  formId: string,
  rawCode: string,
): Promise<CouponLookup> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(code))
    return { ok: false, message: "That code isn't valid" };
  const coupon = await db.coupon.findUnique({
    where: { formId_code: { formId, code } },
    select: {
      code: true,
      type: true,
      value: true,
      maxUses: true,
      used: true,
      expiresAt: true,
    },
  });
  if (!coupon) return { ok: false, message: "That code isn't valid" };
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return { ok: false, message: "That code has expired" };
  if (coupon.maxUses !== null && coupon.used >= coupon.maxUses) {
    return { ok: false, message: "That code has been fully used" };
  }
  return {
    ok: true,
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
  };
}

/**
 * Count one use, atomically, when a discounted submission completes. Returns
 * false if the code ran out in the meantime (two people racing for the last
 * use); the payment still stands, and the overshoot is audited.
 */
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  formId: string,
  code: string,
) {
  const updated = await tx.$executeRaw`
    update public.coupons set used = used + 1, updated_at = now()
    where form_id = ${formId}::uuid and code = ${code}
      and (max_uses is null or used < max_uses)`;
  return updated === 1;
}
