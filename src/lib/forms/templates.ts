import { createBlock } from "./blocks";
import {
  type Block,
  type FieldType,
  type FormSchema,
  formSchemaSchema,
  newId,
  type Pricing,
} from "./schema";

// Starter templates by use case (technical plan section 4: "10 templates").
// Each call builds fresh ids, so two forms from one template never share ids.

export type TemplateMeta = {
  id: string;
  name: string;
  summary: string;
  category: "Payments" | "Events" | "Free";
};

type Spec = {
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[];
  description?: string;
};

function block(spec: Spec): Block {
  const b = createBlock(spec.type) as Block & {
    options?: { id: string; label: string }[];
  };
  const out = {
    ...b,
    label: spec.label,
    required: spec.required ?? false,
  } as Block;
  if (spec.description) out.description = spec.description;
  if (spec.options && "options" in out) {
    (out as { options: { id: string; label: string }[] }).options =
      spec.options.map((label) => ({ id: newId(), label }));
  }
  return out;
}

function pay(label: string, pricing: Pricing, allowCoupons = false): Block {
  return {
    ...(createBlock("payment") as Extract<Block, { type: "payment" }>),
    label,
    pricing,
    allowCoupons,
  };
}

const contact: Spec[] = [
  { type: "short_text", label: "Full name", required: true },
  { type: "email", label: "Email", required: true },
  { type: "phone", label: "WhatsApp number", required: true },
];

const item = (label: string, rupees: number, maxQuantity = 10) => ({
  id: newId(),
  label,
  priceMinor: rupees * 100,
  maxQuantity,
});

const builders: Record<
  string,
  {
    meta: TemplateMeta;
    build: () => Pick<FormSchema, "title" | "description" | "blocks">;
  }
> = {
  "coaching-admission": {
    meta: {
      id: "coaching-admission",
      name: "Coaching admission",
      summary: "Student details and the admission fee",
      category: "Payments",
    },
    build: () => ({
      title: "Admission form",
      description:
        "Fill in the student's details and pay the admission fee to confirm the seat.",
      blocks: [
        block({ type: "short_text", label: "Student name", required: true }),
        block({
          type: "short_text",
          label: "Parent or guardian name",
          required: true,
        }),
        block({
          type: "phone",
          label: "Parent's WhatsApp number",
          required: true,
        }),
        block({ type: "email", label: "Email", required: true }),
        block({
          type: "dropdown",
          label: "Class",
          required: true,
          options: ["Class 9", "Class 10", "Class 11", "Class 12", "Dropper"],
        }),
        block({
          type: "single_choice",
          label: "Batch",
          required: true,
          options: ["Morning", "Evening", "Weekend"],
        }),
        pay(
          "Admission fee",
          { mode: "fixed", amountMinor: 200000, itemLabel: "Admission fee" },
          true,
        ),
      ],
    }),
  },
  "event-tickets": {
    meta: {
      id: "event-tickets",
      name: "Event tickets",
      summary: "Ticket tiers with early-bird pricing",
      category: "Events",
    },
    build: () => ({
      title: "Get your tickets",
      description:
        "Pick a ticket and pay with UPI. Your ticket is confirmed instantly.",
      blocks: [
        ...contact.map(block),
        pay(
          "Ticket",
          {
            mode: "tiers",
            tiers: [
              { id: newId(), label: "Early bird", priceMinor: 29900 },
              { id: newId(), label: "Regular", priceMinor: 49900 },
              { id: newId(), label: "VIP", priceMinor: 149900 },
            ],
          },
          true,
        ),
      ],
    }),
  },
  "college-fest": {
    meta: {
      id: "college-fest",
      name: "College fest registration",
      summary: "Pick events, pay per event",
      category: "Events",
    },
    build: () => ({
      title: "Fest registration",
      description: "Register for one or more events. Fees are per participant.",
      blocks: [
        ...contact.map(block),
        block({ type: "short_text", label: "College name", required: true }),
        block({
          type: "single_choice",
          label: "Year",
          required: true,
          options: [
            "1st year",
            "2nd year",
            "3rd year",
            "4th year",
            "Postgraduate",
          ],
        }),
        pay("Events", {
          mode: "items",
          items: [
            item("Hackathon", 299, 1),
            item("Battle of bands", 499, 1),
            item("Quiz", 99, 1),
            item("Photography walk", 149, 1),
          ],
        }),
      ],
    }),
  },
  "workshop-booking": {
    meta: {
      id: "workshop-booking",
      name: "Workshop booking",
      summary: "Book a seat in a paid workshop",
      category: "Events",
    },
    build: () => ({
      title: "Book your workshop seat",
      description:
        "Seats are limited. Your booking is confirmed once payment goes through.",
      blocks: [
        ...contact.map(block),
        block({
          type: "single_choice",
          label: "Experience level",
          required: true,
          options: ["Beginner", "Intermediate", "Advanced"],
        }),
        block({ type: "long_text", label: "What do you want to learn?" }),
        pay(
          "Workshop fee",
          { mode: "fixed", amountMinor: 99900, itemLabel: "Workshop seat" },
          true,
        ),
      ],
    }),
  },
  "order-form": {
    meta: {
      id: "order-form",
      name: "Order form",
      summary: "Products with quantities and delivery details",
      category: "Payments",
    },
    build: () => ({
      title: "Place your order",
      description: "Choose quantities, add your address and pay with UPI.",
      blocks: [
        pay(
          "Your order",
          {
            mode: "items",
            items: [
              item("Classic tote bag", 499),
              item("Printed T-shirt", 799),
              item("Sticker pack", 149),
            ],
          },
          true,
        ),
        ...contact.map(block),
        block({ type: "long_text", label: "Delivery address", required: true }),
        block({ type: "short_text", label: "PIN code", required: true }),
      ],
    }),
  },
  donation: {
    meta: {
      id: "donation",
      name: "Donation",
      summary: "Donors choose their own amount",
      category: "Payments",
    },
    build: () => ({
      title: "Support our work",
      description: "Every rupee goes straight to the cause.",
      blocks: [
        block({ type: "short_text", label: "Your name", required: true }),
        block({
          type: "email",
          label: "Email for your receipt",
          required: true,
        }),
        block({ type: "phone", label: "Phone number" }),
        pay("Donation", {
          mode: "custom",
          minMinor: 10000,
          maxMinor: 10000000,
          suggestedMinor: [50000, 100000, 250000, 500000],
        }),
        block({ type: "long_text", label: "A message (optional)" }),
      ],
    }),
  },
  "consultation-booking": {
    meta: {
      id: "consultation-booking",
      name: "Consultation booking",
      summary: "Advance payment for a call or visit",
      category: "Payments",
    },
    build: () => ({
      title: "Book a consultation",
      description:
        "Pay the booking amount to reserve your slot. We'll confirm the time on WhatsApp.",
      blocks: [
        ...contact.map(block),
        block({ type: "date", label: "Preferred date", required: true }),
        block({
          type: "single_choice",
          label: "Preferred time",
          required: true,
          options: ["Morning", "Afternoon", "Evening"],
        }),
        block({ type: "long_text", label: "What would you like to discuss?" }),
        pay("Booking amount", {
          mode: "fixed",
          amountMinor: 50000,
          itemLabel: "Consultation advance",
        }),
      ],
    }),
  },
  "membership-fee": {
    meta: {
      id: "membership-fee",
      name: "Membership fee",
      summary: "Monthly, yearly or lifetime plans",
      category: "Payments",
    },
    build: () => ({
      title: "Become a member",
      description: "Choose a plan and pay to activate your membership.",
      blocks: [
        ...contact.map(block),
        block({ type: "date", label: "Date of birth" }),
        pay(
          "Plan",
          {
            mode: "tiers",
            tiers: [
              { id: newId(), label: "Monthly", priceMinor: 50000 },
              { id: newId(), label: "Yearly", priceMinor: 500000 },
              { id: newId(), label: "Lifetime", priceMinor: 1500000 },
            ],
          },
          true,
        ),
      ],
    }),
  },
  rsvp: {
    meta: {
      id: "rsvp",
      name: "RSVP",
      summary: "Free attendance and meal preferences",
      category: "Free",
    },
    build: () => {
      const attending = block({
        type: "single_choice",
        label: "Will you attend?",
        required: true,
        options: ["Yes", "No"],
      }) as Extract<Block, { type: "single_choice" }>;
      const guests = block({
        type: "number",
        label: "Number of guests (including you)",
        required: true,
      });
      guests.visibility = {
        fieldId: attending.id,
        op: "equals",
        value: attending.options[0]?.id,
      };
      const meal = block({
        type: "multi_choice",
        label: "Meal preference",
        options: ["Veg", "Non-veg", "Jain"],
      });
      meal.visibility = {
        fieldId: attending.id,
        op: "equals",
        value: attending.options[0]?.id,
      };
      return {
        title: "RSVP",
        description: "Let us know if you can make it.",
        blocks: [
          block({ type: "short_text", label: "Your name", required: true }),
          block({ type: "phone", label: "Phone number" }),
          attending,
          guests,
          meal,
        ],
      };
    },
  },
  feedback: {
    meta: {
      id: "feedback",
      name: "Feedback",
      summary: "Rating plus open comments",
      category: "Free",
    },
    build: () => ({
      title: "How did we do?",
      description: "Two minutes, honest answers. Thank you!",
      blocks: [
        block({
          type: "rating",
          label: "Overall, how was your experience?",
          required: true,
        }),
        block({
          type: "single_choice",
          label: "Would you recommend us to a friend?",
          required: true,
          options: ["Yes", "Maybe", "No"],
        }),
        block({ type: "long_text", label: "What could we do better?" }),
        block({ type: "email", label: "Email (if you'd like a reply)" }),
      ],
    }),
  },
};

export const TEMPLATES: TemplateMeta[] = Object.values(builders).map(
  (b) => b.meta,
);

/** A complete, valid form schema for a template, or null for an unknown id. */
export function buildTemplate(templateId: string): FormSchema | null {
  const entry = builders[templateId];
  if (!entry) return null;
  const { title, description, blocks } = entry.build();
  return formSchemaSchema.parse({ title, description, blocks });
}
