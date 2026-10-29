import { z } from "zod";
import { MAX_CHARGE_MINOR } from "@/lib/money";

// The form schema: an ordered list of blocks plus settings. It is the shape
// stored in forms.draft_json and, once published, in the immutable
// form_versions.schema_json. Shared by the builder, the public renderer and the
// server, so every boundary validates with the same rules.

export const SCHEMA_VERSION = 1;

const id = z.string().regex(/^[a-z0-9]{4,16}$/, "Invalid id");
const label = z.string().trim().min(1, "Add a label").max(300);
const description = z.string().trim().max(1000).optional();
const paise = z.number().int().min(0).max(MAX_CHARGE_MINOR);

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "dropdown",
  "single_choice",
  "multi_choice",
  "date",
  "rating",
  "statement",
  "payment",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const RULE_OPS = [
  "equals",
  "not_equals",
  "includes",
  "is_answered",
  "is_not_answered",
] as const;

/** Show this block only when the rule holds (DESIGN: conditional logic). */
export const visibilityRuleSchema = z.object({
  fieldId: id,
  op: z.enum(RULE_OPS),
  value: z.string().max(300).optional(),
});
export type VisibilityRule = z.infer<typeof visibilityRuleSchema>;

const blockBase = {
  id,
  label,
  description,
  required: z.boolean().default(false),
  visibility: visibilityRuleSchema.nullable().default(null),
};

export const optionSchema = z.object({
  id,
  label: z.string().trim().min(1).max(200),
});
const options = z.array(optionSchema).min(1, "Add at least one option").max(50);

export const pricingItemSchema = z.object({
  id,
  label: z.string().trim().min(1, "Name the item").max(120),
  priceMinor: paise,
  maxQuantity: z.number().int().min(1).max(1000).default(10),
});

export const pricingSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("fixed"),
    amountMinor: paise,
    itemLabel: z.string().trim().max(120).default(""),
  }),
  z.object({
    mode: z.literal("items"),
    items: z.array(pricingItemSchema).min(1).max(50),
  }),
  z.object({
    mode: z.literal("tiers"),
    tiers: z
      .array(
        z.object({
          id,
          label: z.string().trim().min(1).max(120),
          priceMinor: paise,
        }),
      )
      .min(1)
      .max(20),
  }),
  z.object({
    mode: z.literal("custom"),
    minMinor: paise,
    maxMinor: paise,
    suggestedMinor: z.array(paise).max(6).default([]),
  }),
]);
export type Pricing = z.infer<typeof pricingSchema>;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    ...blockBase,
    type: z.literal("short_text"),
    placeholder: z.string().max(200).optional(),
    maxLength: z.number().int().min(1).max(1000).default(200),
  }),
  z.object({
    ...blockBase,
    type: z.literal("long_text"),
    placeholder: z.string().max(200).optional(),
    maxLength: z.number().int().min(1).max(10000).default(2000),
  }),
  z.object({ ...blockBase, type: z.literal("email") }),
  z.object({ ...blockBase, type: z.literal("phone") }),
  z.object({
    ...blockBase,
    type: z.literal("number"),
    min: z.number().optional(),
    max: z.number().optional(),
    integer: z.boolean().default(false),
  }),
  z.object({ ...blockBase, type: z.literal("dropdown"), options }),
  z.object({ ...blockBase, type: z.literal("single_choice"), options }),
  z.object({
    ...blockBase,
    type: z.literal("multi_choice"),
    options,
    maxSelections: z.number().int().min(1).max(50).optional(),
  }),
  z.object({ ...blockBase, type: z.literal("date") }),
  z.object({
    ...blockBase,
    type: z.literal("rating"),
    max: z.number().int().min(3).max(10).default(5),
  }),
  z.object({
    ...blockBase,
    type: z.literal("statement"),
    required: z.literal(false).default(false),
  }),
  z.object({
    ...blockBase,
    type: z.literal("payment"),
    pricing: pricingSchema,
    allowCoupons: z.boolean().default(false),
  }),
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockOf<T extends FieldType> = Extract<Block, { type: T }>;

export const THEME_PRESETS = ["midnight", "paper"] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];

export const settingsSchema = z.object({
  theme: z
    .object({
      preset: z.enum(THEME_PRESETS).default("paper"),
      accent: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .nullable()
        .default(null),
    })
    .default({ preset: "paper", accent: null }),
  submitLabel: z.string().trim().max(40).default(""),
  thankYouTitle: z.string().trim().max(120).default("Thank you!"),
  thankYouMessage: z
    .string()
    .trim()
    .max(1000)
    .default("Your response has been recorded."),
  closed: z.boolean().default(false),
  closedMessage: z
    .string()
    .trim()
    .max(500)
    .default("This form is no longer accepting responses."),
});
export type FormSettings = z.infer<typeof settingsSchema>;

export const formSchemaSchema = z
  .object({
    version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
    title: z.string().trim().min(1, "Give the form a title").max(150),
    description: z.string().trim().max(2000).default(""),
    blocks: z.array(blockSchema).max(100, "Forms can have up to 100 blocks"),
    settings: settingsSchema.default(settingsSchema.parse({})),
  })
  .superRefine((form, ctx) => {
    const seen = new Map<string, number>();
    let payments = 0;
    form.blocks.forEach((block, index) => {
      if (seen.has(block.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "id"],
          message: "Duplicate block id",
        });
      }
      // Rules may only point at an earlier answerable block: no cycles, and
      // the respondent always answers the condition first.
      const rule = block.visibility;
      if (rule) {
        const target = seen.has(rule.fieldId)
          ? form.blocks[seen.get(rule.fieldId)!]
          : undefined;
        if (
          !target ||
          target.type === "statement" ||
          target.type === "payment"
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["blocks", index, "visibility"],
            message: "A condition can only use a question above this one",
          });
        }
      }
      seen.set(block.id, index);
      if (block.type === "payment") {
        payments++;
        if (payments > 1) {
          ctx.addIssue({
            code: "custom",
            path: ["blocks", index],
            message: "A form can have one payment block",
          });
        }
        const p = block.pricing;
        if (p.mode === "custom" && p.maxMinor < p.minMinor) {
          ctx.addIssue({
            code: "custom",
            path: ["blocks", index, "pricing"],
            message: "Maximum must be at least the minimum",
          });
        }
      }
      if ("options" in block) {
        const ids = new Set(block.options.map((o) => o.id));
        if (ids.size !== block.options.length) {
          ctx.addIssue({
            code: "custom",
            path: ["blocks", index, "options"],
            message: "Duplicate option id",
          });
        }
      }
    });
  });
export type FormSchema = z.infer<typeof formSchemaSchema>;

/** Parse an unknown value (from the database or the client) into a schema. */
export function parseFormSchema(value: unknown) {
  return formSchemaSchema.safeParse(value);
}

export { findPaymentBlock, isAnswerable } from "./helpers";

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Short random id for blocks and options. Works in the browser and on Node. */
export function newId(length = 8): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
  return out;
}

export function emptyFormSchema(title: string): FormSchema {
  return formSchemaSchema.parse({ title, blocks: [] });
}
