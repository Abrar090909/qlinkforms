import { describe, expect, it } from "vitest";
import { createBlock } from "@/lib/forms/blocks";
import {
  checkAnswer,
  displayAnswer,
  normalisePhone,
  validateAnswers,
  visibleBlockIds,
} from "@/lib/forms/answers";
import {
  computePrice,
  discountFor,
  parsePaymentAnswer,
} from "@/lib/forms/pricing";
import {
  type Block,
  type BlockOf,
  formSchemaSchema,
  newId,
} from "@/lib/forms/schema";
import { formatPaise, paiseToRupeesInput, rupeesToPaise } from "@/lib/money";

describe("money", () => {
  it("formats paise with Indian grouping and exact paise", () => {
    expect(formatPaise(49900)).toBe("₹499");
    expect(formatPaise(49950)).toBe("₹499.50");
    expect(formatPaise(12345678)).toBe("₹1,23,456.78");
    expect(formatPaise(5)).toBe("₹0.05");
  });

  it("parses typed rupees into integer paise without floats", () => {
    expect(rupeesToPaise("499")).toBe(49900);
    expect(rupeesToPaise("499.5")).toBe(49950);
    expect(rupeesToPaise("₹1,299.99")).toBe(129999);
    // 0.1 + 0.2 style float traps never happen: we parse digits.
    expect(rupeesToPaise("0.29")).toBe(29);
    expect(rupeesToPaise("1.234")).toBeNull();
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(paiseToRupeesInput(49950)).toBe("499.50");
    expect(paiseToRupeesInput(49900)).toBe("499");
  });
});

function payment(pricing: BlockOf<"payment">["pricing"], allowCoupons = true) {
  return {
    ...(createBlock("payment") as BlockOf<"payment">),
    pricing,
    allowCoupons,
  };
}

describe("computePrice", () => {
  it("charges a fixed amount", () => {
    const r = computePrice(
      payment({ mode: "fixed", amountMinor: 49900, itemLabel: "Fee" }),
      {},
    );
    expect(r).toEqual({
      ok: true,
      breakdown: {
        lines: [
          { label: "Fee", quantity: 1, unitMinor: 49900, totalMinor: 49900 },
        ],
        subtotalMinor: 49900,
        discountMinor: 0,
        totalMinor: 49900,
        couponCode: null,
      },
    });
  });

  it("multiplies items by quantity in the owner's order and enforces limits", () => {
    const block = payment({
      mode: "items",
      items: [
        { id: "aaaa", label: "T-shirt", priceMinor: 39900, maxQuantity: 5 },
        { id: "bbbb", label: "Cap", priceMinor: 19950, maxQuantity: 2 },
      ],
    });
    const r = computePrice(block, { items: { bbbb: 2, aaaa: 1 } });
    expect(r.ok && r.breakdown.lines.map((l) => l.label)).toEqual([
      "T-shirt",
      "Cap",
    ]);
    expect(r.ok && r.breakdown.totalMinor).toBe(39900 + 2 * 19950);
    expect(computePrice(block, { items: { bbbb: 3 } }).ok).toBe(false);
    expect(computePrice(block, { items: { zzzz: 1 } }).ok).toBe(false);
    expect(computePrice(block, { items: {} }).ok).toBe(false);
  });

  it("uses only server-side prices for tiers, never a client amount", () => {
    const block = payment({
      mode: "tiers",
      tiers: [{ id: "earl", label: "Early bird", priceMinor: 29900 }],
    });
    // A tampered amountMinor in the answer is ignored for tiers.
    const r = computePrice(block, { tierId: "earl", amountMinor: 100 });
    expect(r.ok && r.breakdown.totalMinor).toBe(29900);
    expect(computePrice(block, { tierId: "nope" }).ok).toBe(false);
  });

  it("bounds custom amounts", () => {
    const block = payment({
      mode: "custom",
      minMinor: 10000,
      maxMinor: 1000000,
      suggestedMinor: [],
    });
    expect(computePrice(block, { amountMinor: 50000 }).ok).toBe(true);
    expect(computePrice(block, { amountMinor: 9999 }).ok).toBe(false);
    expect(computePrice(block, { amountMinor: 1000001 }).ok).toBe(false);
    expect(computePrice(block, {}).ok).toBe(false);
  });

  it("applies percent and fixed coupons with integer rounding down", () => {
    const block = payment({ mode: "fixed", amountMinor: 99999, itemLabel: "" });
    const pct = computePrice(
      block,
      {},
      { code: "TEN", type: "percent", value: 1000 },
    );
    expect(pct.ok && pct.breakdown).toMatchObject({
      discountMinor: 9999,
      totalMinor: 90000,
      couponCode: "TEN",
    });
    expect(discountFor(500, { code: "BIG", type: "fixed", value: 1000 })).toBe(
      500,
    );
    const free = computePrice(
      block,
      {},
      { code: "ALL", type: "percent", value: 10000 },
    );
    expect(free.ok && free.breakdown.totalMinor).toBe(0);
  });

  it("ignores coupons when the block doesn't allow them", () => {
    const block = payment(
      { mode: "fixed", amountMinor: 10000, itemLabel: "" },
      false,
    );
    const r = computePrice(
      block,
      {},
      { code: "TEN", type: "percent", value: 1000 },
    );
    expect(r.ok && r.breakdown).toMatchObject({
      discountMinor: 0,
      totalMinor: 10000,
      couponCode: null,
    });
  });

  it("rejects totals between 1 paisa and ₹1, which Razorpay can't charge", () => {
    const block = payment({ mode: "fixed", amountMinor: 150, itemLabel: "" });
    const r = computePrice(block, {}, { code: "X", type: "fixed", value: 100 });
    expect(r).toEqual({ ok: false, error: "The minimum payment is ₹1" });
  });
});

describe("parsePaymentAnswer", () => {
  it("keeps valid fields, trims codes and drops unknown keys", () => {
    expect(
      parsePaymentAnswer({ items: { aaaa: 2 }, couponCode: " TEN ", hack: 1 }),
    ).toEqual({ items: { aaaa: 2 }, couponCode: "TEN" });
    expect(parsePaymentAnswer(undefined)).toEqual({});
  });

  it("rejects wrong shapes and out-of-range numbers", () => {
    expect(parsePaymentAnswer("x")).toBeNull();
    expect(parsePaymentAnswer([1])).toBeNull();
    expect(parsePaymentAnswer({ items: { aaaa: 1.5 } })).toBeNull();
    expect(parsePaymentAnswer({ items: { aaaa: -1 } })).toBeNull();
    expect(parsePaymentAnswer({ amountMinor: 1e12 })).toBeNull();
    expect(parsePaymentAnswer({ tierId: 5 })).toBeNull();
  });
});

describe("answers", () => {
  const name: Block = {
    ...createBlock("short_text"),
    id: "name",
    required: true,
  } as Block;
  const attend: Block = {
    ...(createBlock("single_choice") as BlockOf<"single_choice">),
    id: "attend",
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
  };
  const meal: Block = {
    ...(createBlock("multi_choice") as BlockOf<"multi_choice">),
    id: "meal",
    required: true,
    options: [
      { id: "veg", label: "Veg" },
      { id: "jain", label: "Jain" },
    ],
    visibility: { fieldId: "attend", op: "equals", value: "yes" },
  };
  const why: Block = {
    ...createBlock("long_text"),
    id: "why",
    visibility: { fieldId: "meal", op: "includes", value: "jain" },
  } as Block;
  const schema = { blocks: [name, attend, meal, why] };

  it("shows blocks only when their condition holds, and chains through hidden blocks", () => {
    expect([
      ...visibleBlockIds(schema, { attend: "no", meal: ["jain"] }),
    ]).toEqual(["name", "attend"]);
    expect([
      ...visibleBlockIds(schema, { attend: "yes", meal: ["jain"] }),
    ]).toEqual(["name", "attend", "meal", "why"]);
  });

  it("requires only visible questions and drops hidden answers", () => {
    const hidden = validateAnswers(schema, {
      name: " Asha ",
      attend: "no",
      meal: ["veg"],
    });
    expect(hidden).toEqual({
      ok: true,
      answers: { name: "Asha", attend: "no" },
    });
    const missing = validateAnswers(schema, { name: "Asha", attend: "yes" });
    expect(missing).toEqual({
      ok: false,
      errors: { meal: "This question is required" },
    });
  });

  it("rejects option ids that aren't in the form", () => {
    expect(checkAnswer(attend, "maybe").ok).toBe(false);
    expect(checkAnswer(meal, ["veg", "beef"]).ok).toBe(false);
    expect(checkAnswer(meal, ["jain", "veg", "veg"])).toEqual({
      ok: true,
      value: ["veg", "jain"],
    });
  });

  it("normalises Indian phone numbers", () => {
    expect(normalisePhone("98765 43210")).toBe("+919876543210");
    expect(normalisePhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalisePhone("09876543210")).toBe("+919876543210");
    expect(normalisePhone("12345")).toBeNull();
    expect(normalisePhone("+14155550100")).toBe("+14155550100");
  });

  it("validates emails, numbers, dates and ratings", () => {
    expect(checkAnswer(createBlock("email"), "A@B.co")).toEqual({
      ok: true,
      value: "a@b.co",
    });
    expect(checkAnswer(createBlock("email"), "nope").ok).toBe(false);
    const num = {
      ...(createBlock("number") as BlockOf<"number">),
      min: 1,
      max: 5,
    };
    expect(checkAnswer(num, "3")).toEqual({ ok: true, value: 3 });
    expect(checkAnswer(num, "2.5").ok).toBe(false);
    expect(checkAnswer(num, 9).ok).toBe(false);
    expect(checkAnswer(createBlock("date"), "2026-02-30").ok).toBe(false);
    expect(checkAnswer(createBlock("date"), "2026-02-28").ok).toBe(true);
    expect(checkAnswer(createBlock("rating"), 6).ok).toBe(false);
  });

  it("treats a fixed price as always chosen", () => {
    const fixed = createBlock("payment");
    expect(checkAnswer(fixed, undefined)).toEqual({ ok: true, value: {} });
  });

  it("displays choice labels, not ids", () => {
    expect(displayAnswer(meal, ["veg", "jain"])).toBe("Veg, Jain");
  });
});

describe("form schema", () => {
  it("accepts a built form and fills defaults", () => {
    const parsed = formSchemaSchema.safeParse({
      title: "Fest",
      blocks: [createBlock("email")],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.settings.theme.preset).toBe("paper");
  });

  it("rejects conditions that point forward or at themselves", () => {
    const a = { ...createBlock("short_text"), id: "aaaa" } as Block;
    const b = {
      ...createBlock("short_text"),
      id: "bbbb",
      visibility: { fieldId: "cccc", op: "is_answered" },
    } as Block;
    const c = { ...createBlock("short_text"), id: "cccc" } as Block;
    expect(
      formSchemaSchema.safeParse({ title: "x", blocks: [a, b, c] }).success,
    ).toBe(false);
  });

  it("allows one payment block only", () => {
    const blocks = [createBlock("payment"), createBlock("payment")];
    expect(formSchemaSchema.safeParse({ title: "x", blocks }).success).toBe(
      false,
    );
  });

  it("makes short url-safe ids", () => {
    expect(newId()).toMatch(/^[a-z0-9]{8}$/);
  });
});
