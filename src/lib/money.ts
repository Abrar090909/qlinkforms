// Money is always integer paise (CLAUDE.md rule 1). These helpers convert at
// the edges: user-typed rupees in, formatted rupees out. No floats anywhere.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 49950 -> "₹499.50", 50000 -> "₹500". */
export function formatPaise(minor: number): string {
  if (!Number.isSafeInteger(minor)) throw new Error("Paise must be an integer");
  const rupees = Math.trunc(minor / 100);
  const paise = Math.abs(minor % 100);
  // Format the rupee part with Indian grouping, then append exact paise. This
  // avoids ever dividing into a float.
  const whole = inr.format(rupees).replace(/\.00$/, "");
  if (paise === 0) return whole;
  const sign = minor < 0 && rupees === 0 ? "-" : "";
  return `${sign}${whole}.${String(paise).padStart(2, "0")}`;
}

/**
 * Parse what a person typed as rupees ("499", "499.5", "1,299.00") into paise.
 * Returns null for anything that isn't a plain non-negative amount with at most
 * two decimals.
 */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.trim().replace(/[₹,\s]/g, "");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0"));
  return rupees * 100 + paise;
}

/** 49950 -> "499.50", for editing in an input. */
export function paiseToRupeesInput(minor: number): string {
  const rupees = Math.trunc(minor / 100);
  const paise = minor % 100;
  return paise === 0
    ? String(rupees)
    : `${rupees}.${String(paise).padStart(2, "0")}`;
}

/** Razorpay's smallest chargeable amount is ₹1. */
export const MIN_CHARGE_MINOR = 100;
/** A sanity cap per submission (₹5,00,000) to catch typos in prices. */
export const MAX_CHARGE_MINOR = 50_000_000;
