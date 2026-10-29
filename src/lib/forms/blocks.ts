import { type Block, type FieldType, newId } from "./schema";

// Builder catalogue: what each block type is called in the "/" menu and what a
// freshly inserted block looks like.

export type BlockMeta = {
  type: FieldType;
  name: string;
  hint: string;
  /** Extra words the "/" menu matches on. */
  keywords: string;
  group: "Questions" | "Choices" | "Payment" | "Layout";
};

export const BLOCK_CATALOGUE: BlockMeta[] = [
  {
    type: "short_text",
    name: "Short answer",
    hint: "One line of text",
    keywords: "text name input",
    group: "Questions",
  },
  {
    type: "long_text",
    name: "Long answer",
    hint: "A paragraph",
    keywords: "textarea paragraph message",
    group: "Questions",
  },
  {
    type: "email",
    name: "Email",
    hint: "Checked email address",
    keywords: "mail",
    group: "Questions",
  },
  {
    type: "phone",
    name: "Phone",
    hint: "Indian mobile number",
    keywords: "mobile whatsapp number",
    group: "Questions",
  },
  {
    type: "number",
    name: "Number",
    hint: "A number with limits",
    keywords: "age count quantity",
    group: "Questions",
  },
  {
    type: "date",
    name: "Date",
    hint: "Pick a date",
    keywords: "day calendar dob",
    group: "Questions",
  },
  {
    type: "single_choice",
    name: "Single choice",
    hint: "Pick one option",
    keywords: "radio option",
    group: "Choices",
  },
  {
    type: "multi_choice",
    name: "Multiple choice",
    hint: "Pick several options",
    keywords: "checkbox checkboxes",
    group: "Choices",
  },
  {
    type: "dropdown",
    name: "Dropdown",
    hint: "Pick one from a list",
    keywords: "select list",
    group: "Choices",
  },
  {
    type: "rating",
    name: "Rating",
    hint: "1 to 5 stars",
    keywords: "stars score feedback",
    group: "Choices",
  },
  {
    type: "payment",
    name: "Payment",
    hint: "Collect UPI, card or netbanking",
    keywords: "pay price fee upi razorpay money ticket donation",
    group: "Payment",
  },
  {
    type: "statement",
    name: "Text",
    hint: "A heading or note, no answer",
    keywords: "heading title section paragraph note",
    group: "Layout",
  },
];

export function blockMeta(type: FieldType): BlockMeta {
  return BLOCK_CATALOGUE.find((m) => m.type === type)!;
}

function option(label: string) {
  return { id: newId(), label };
}

/** A new block of the given type with sensible defaults. */
export function createBlock(type: FieldType): Block {
  const base = {
    id: newId(),
    required: false,
    visibility: null,
    description: undefined,
  };
  switch (type) {
    case "short_text":
      return { ...base, type, label: "Your name", maxLength: 200 };
    case "long_text":
      return { ...base, type, label: "Anything else?", maxLength: 2000 };
    case "email":
      return { ...base, type, label: "Email address", required: true };
    case "phone":
      return { ...base, type, label: "Phone number" };
    case "number":
      return { ...base, type, label: "How many?", integer: true };
    case "date":
      return { ...base, type, label: "Date" };
    case "single_choice":
    case "dropdown":
      return {
        ...base,
        type,
        label: "Choose one",
        options: [option("Option 1"), option("Option 2")],
      };
    case "multi_choice":
      return {
        ...base,
        type,
        label: "Choose all that apply",
        options: [option("Option 1"), option("Option 2")],
      };
    case "rating":
      return { ...base, type, label: "How would you rate us?", max: 5 };
    case "statement":
      return { ...base, type, label: "Section title", required: false };
    case "payment":
      return {
        ...base,
        type,
        label: "Payment",
        required: true,
        allowCoupons: false,
        pricing: { mode: "fixed", amountMinor: 49900, itemLabel: "" },
      };
  }
}
