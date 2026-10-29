import { type PaymentAnswer, parsePaymentAnswer } from "./pricing";
import type { Block, FormSchema, VisibilityRule } from "./schema";

// Answer validation and conditional visibility. Shared by the public form (live
// errors) and the server (the real check before anything is stored).

export type AnswerValue = string | number | string[] | PaymentAnswer;
export type Answers = Record<string, AnswerValue | undefined>;

function isEmpty(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const p = value as PaymentAnswer;
    const anyItems = Object.values(p.items ?? {}).some((q) => q > 0);
    return !anyItems && !p.tierId && p.amountMinor === undefined;
  }
  return false;
}

function ruleHolds(rule: VisibilityRule, value: unknown) {
  switch (rule.op) {
    case "is_answered":
      return !isEmpty(value);
    case "is_not_answered":
      return isEmpty(value);
    case "includes":
      return Array.isArray(value)
        ? value.includes(rule.value ?? "")
        : typeof value === "string" &&
            value.toLowerCase().includes((rule.value ?? "").toLowerCase());
    case "equals":
    case "not_equals": {
      const matches = Array.isArray(value)
        ? value.length === 1 && value[0] === rule.value
        : String(value ?? "") === (rule.value ?? "");
      return rule.op === "equals" ? matches : !matches;
    }
  }
}

/**
 * Ids of blocks the respondent can see for these answers. A hidden block's
 * answer counts as empty, so rules chain correctly.
 */
export function visibleBlockIds(
  schema: Pick<FormSchema, "blocks">,
  answers: Answers,
) {
  const visible = new Set<string>();
  for (const block of schema.blocks) {
    const rule = block.visibility;
    const shown =
      !rule ||
      ruleHolds(
        rule,
        visible.has(rule.fieldId) ? answers[rule.fieldId] : undefined,
      );
    if (shown) visible.add(block.id);
  }
  return visible;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "98765 43210", "+91-9876543210", "09876543210" -> "+919876543210". */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");
  const indian = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  if (indian) return `+91${indian[1]}`;
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

type Check =
  { ok: true; value: AnswerValue | undefined } | { ok: false; error: string };

/** Validate and clean one answer. Empty optional answers become undefined. */
export function checkAnswer(block: Block, raw: unknown): Check {
  if (block.type === "statement") return { ok: true, value: undefined };
  // A fixed price has nothing to pick: it applies whenever the block is shown.
  if (block.type === "payment" && block.pricing.mode === "fixed") {
    return { ok: true, value: parsePaymentAnswer(raw) ?? {} };
  }
  if (isEmpty(raw)) {
    return block.required
      ? {
          ok: false,
          error:
            block.type === "payment"
              ? "Choose what to pay for"
              : "This question is required",
        }
      : { ok: true, value: undefined };
  }

  switch (block.type) {
    case "short_text":
    case "long_text": {
      if (typeof raw !== "string") return { ok: false, error: "Enter text" };
      const value = raw.trim();
      if (value.length > block.maxLength) {
        return {
          ok: false,
          error: `Keep it under ${block.maxLength} characters`,
        };
      }
      return { ok: true, value };
    }
    case "email": {
      const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
      return EMAIL.test(value) && value.length <= 254
        ? { ok: true, value }
        : { ok: false, error: "Enter a valid email address" };
    }
    case "phone": {
      const value = typeof raw === "string" ? normalisePhone(raw) : null;
      return value
        ? { ok: true, value }
        : { ok: false, error: "Enter a valid phone number" };
    }
    case "number": {
      const n =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number(raw.trim())
            : NaN;
      if (!Number.isFinite(n)) return { ok: false, error: "Enter a number" };
      if (block.integer && !Number.isInteger(n))
        return { ok: false, error: "Enter a whole number" };
      if (block.min !== undefined && n < block.min)
        return { ok: false, error: `Enter ${block.min} or more` };
      if (block.max !== undefined && n > block.max)
        return { ok: false, error: `Enter ${block.max} or less` };
      return { ok: true, value: n };
    }
    case "dropdown":
    case "single_choice": {
      return typeof raw === "string" && block.options.some((o) => o.id === raw)
        ? { ok: true, value: raw }
        : { ok: false, error: "Choose one of the options" };
    }
    case "multi_choice": {
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
        return { ok: false, error: "Choose from the options" };
      }
      const value = [...new Set(raw as string[])];
      if (value.some((v) => !block.options.some((o) => o.id === v))) {
        return { ok: false, error: "Choose from the options" };
      }
      if (block.maxSelections && value.length > block.maxSelections) {
        return { ok: false, error: `Choose up to ${block.maxSelections}` };
      }
      // Store in the owner's option order.
      value.sort(
        (a, b) =>
          block.options.findIndex((o) => o.id === a) -
          block.options.findIndex((o) => o.id === b),
      );
      return { ok: true, value };
    }
    case "date": {
      return typeof raw === "string" && isValidDate(raw)
        ? { ok: true, value: raw }
        : { ok: false, error: "Enter a valid date" };
    }
    case "rating": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isInteger(n) && n >= 1 && n <= block.max
        ? { ok: true, value: n }
        : { ok: false, error: `Choose 1 to ${block.max}` };
    }
    case "payment": {
      const parsed = parsePaymentAnswer(raw);
      return parsed
        ? { ok: true, value: parsed }
        : { ok: false, error: "Choose what to pay for" };
    }
  }
}

export type ValidationResult =
  | { ok: true; answers: Answers }
  | { ok: false; errors: Record<string, string> };

/**
 * Validate every visible block. Hidden blocks are dropped from the stored
 * answers and never required. Unknown keys are ignored.
 */
export function validateAnswers(
  schema: Pick<FormSchema, "blocks">,
  raw: Answers,
): ValidationResult {
  const visible = visibleBlockIds(schema, raw);
  const answers: Answers = {};
  const errors: Record<string, string> = {};
  for (const block of schema.blocks) {
    if (!visible.has(block.id) || block.type === "statement") continue;
    const result = checkAnswer(block, raw[block.id]);
    if (!result.ok) errors[block.id] = result.error;
    else if (result.value !== undefined) answers[block.id] = result.value;
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, answers };
}

/** A readable string for one stored answer (responses table, CSV, emails). */
export function displayAnswer(
  block: Block,
  value: AnswerValue | undefined,
): string {
  if (value === undefined) return "";
  switch (block.type) {
    case "dropdown":
    case "single_choice":
      return block.options.find((o) => o.id === value)?.label ?? "";
    case "multi_choice":
      return (value as string[])
        .map((v) => block.options.find((o) => o.id === v)?.label)
        .filter(Boolean)
        .join(", ");
    case "rating":
      return `${value} / ${block.max}`;
    case "payment":
      return "";
    default:
      return String(value);
  }
}
