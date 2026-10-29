import { MAX_CHARGE_MINOR, MIN_CHARGE_MINOR } from "@/lib/money";
import type { BlockOf } from "./schema";

// The pricing engine. Pure and integer-only, so the browser can show a live
// total while the server recomputes the real amount from the same code and the
// stored schema (CLAUDE.md rule 2: never trust a client amount).
// Deliberately zod-free: this module ships in the public form bundle.

/** What the respondent picked in a payment block. */
export type PaymentAnswer = {
  items?: Record<string, number>;
  tierId?: string;
  amountMinor?: number;
  couponCode?: string;
};

const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Validate an untrusted payment answer. Returns null when anything is the
 * wrong shape; unknown keys are dropped. Empty input is an empty answer.
 */
export function parsePaymentAnswer(raw: unknown): PaymentAnswer | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: PaymentAnswer = {};
  if (r.items !== undefined) {
    if (
      typeof r.items !== "object" ||
      r.items === null ||
      Array.isArray(r.items)
    )
      return null;
    const entries = Object.entries(r.items as Record<string, unknown>);
    if (entries.length > 50) return null;
    const items: Record<string, number> = {};
    for (const [id, quantity] of entries) {
      if (id.length > 16 || !isInt(quantity, 0, 1000)) return null;
      items[id] = quantity;
    }
    out.items = items;
  }
  if (r.tierId !== undefined) {
    if (typeof r.tierId !== "string" || r.tierId.length > 16) return null;
    out.tierId = r.tierId;
  }
  if (r.amountMinor !== undefined) {
    if (!isInt(r.amountMinor, 0, MAX_CHARGE_MINOR)) return null;
    out.amountMinor = r.amountMinor;
  }
  if (r.couponCode !== undefined) {
    if (typeof r.couponCode !== "string") return null;
    const code = r.couponCode.trim();
    if (code.length > 40) return null;
    if (code) out.couponCode = code;
  }
  return out;
}

/** A coupon the server has already found valid for this form. */
export type AppliedCoupon = {
  code: string;
  type: "percent" | "fixed";
  /** Basis points for percent (1000 = 10%), paise for fixed. */
  value: number;
};

export type PriceLine = {
  label: string;
  quantity: number;
  unitMinor: number;
  totalMinor: number;
};

export type PriceBreakdown = {
  lines: PriceLine[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  couponCode: string | null;
};

export type PriceResult =
  { ok: true; breakdown: PriceBreakdown } | { ok: false; error: string };

export function discountFor(subtotalMinor: number, coupon: AppliedCoupon) {
  const raw =
    coupon.type === "percent"
      ? Math.floor((subtotalMinor * Math.min(coupon.value, 10000)) / 10000)
      : coupon.value;
  return Math.min(raw, subtotalMinor);
}

export function computePrice(
  block: BlockOf<"payment">,
  answer: PaymentAnswer | undefined,
  coupon: AppliedCoupon | null = null,
): PriceResult {
  const pricing = block.pricing;
  const lines: PriceLine[] = [];

  switch (pricing.mode) {
    case "fixed":
      lines.push({
        label: pricing.itemLabel || block.label,
        quantity: 1,
        unitMinor: pricing.amountMinor,
        totalMinor: pricing.amountMinor,
      });
      break;
    case "items": {
      const chosen = answer?.items ?? {};
      const known = new Set(pricing.items.map((i) => i.id));
      if (
        Object.entries(chosen).some(
          ([itemId, q]) => q > 0 && !known.has(itemId),
        )
      ) {
        return { ok: false, error: "One of the items is no longer available" };
      }
      // Walk the owner's item order, whatever order the answer came in.
      for (const item of pricing.items) {
        const quantity = chosen[item.id] ?? 0;
        if (quantity === 0) continue;
        if (quantity > item.maxQuantity) {
          return {
            ok: false,
            error: `You can order up to ${item.maxQuantity} of ${item.label}`,
          };
        }
        lines.push({
          label: item.label,
          quantity,
          unitMinor: item.priceMinor,
          totalMinor: item.priceMinor * quantity,
        });
      }
      if (lines.length === 0)
        return { ok: false, error: "Choose at least one item" };
      break;
    }
    case "tiers": {
      const tier = pricing.tiers.find((t) => t.id === answer?.tierId);
      if (!tier) return { ok: false, error: "Choose an option" };
      lines.push({
        label: tier.label,
        quantity: 1,
        unitMinor: tier.priceMinor,
        totalMinor: tier.priceMinor,
      });
      break;
    }
    case "custom": {
      const amount = answer?.amountMinor;
      if (amount === undefined) return { ok: false, error: "Enter an amount" };
      if (amount < pricing.minMinor || amount > pricing.maxMinor) {
        return { ok: false, error: "Enter an amount within the allowed range" };
      }
      lines.push({
        label: block.label,
        quantity: 1,
        unitMinor: amount,
        totalMinor: amount,
      });
      break;
    }
  }

  const subtotalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
  if (
    !Number.isSafeInteger(subtotalMinor) ||
    subtotalMinor > MAX_CHARGE_MINOR
  ) {
    return { ok: false, error: "The total is too large" };
  }
  const usable = coupon && block.allowCoupons ? coupon : null;
  const discountMinor = usable ? discountFor(subtotalMinor, usable) : 0;
  const totalMinor = subtotalMinor - discountMinor;
  if (totalMinor > 0 && totalMinor < MIN_CHARGE_MINOR) {
    return { ok: false, error: "The minimum payment is ₹1" };
  }
  return {
    ok: true,
    breakdown: {
      lines,
      subtotalMinor,
      discountMinor,
      totalMinor,
      couponCode: usable ? usable.code : null,
    },
  };
}

/** True when the block needs the respondent to pick something before pricing. */
export function needsSelection(block: BlockOf<"payment">) {
  return block.pricing.mode !== "fixed";
}
