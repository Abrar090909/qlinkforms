"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { controlClasses, FieldError } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  type Block,
  type BlockOf,
  newId,
  type Pricing,
} from "@/lib/forms/schema";
import { formatPaise, paiseToRupeesInput, rupeesToPaise } from "@/lib/money";
import { createCouponAction, deleteCouponAction } from "../../actions";

export type CouponRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxUses: number | null;
  used: number;
  expiresAt: string | null;
};

const small = cx(controlClasses, "min-h-11 text-sm");

const MODES: { mode: Pricing["mode"]; name: string; hint: string }[] = [
  { mode: "fixed", name: "Fixed price", hint: "Everyone pays the same" },
  { mode: "items", name: "Items", hint: "Pick quantities" },
  { mode: "tiers", name: "Options", hint: "Pick one price" },
  { mode: "custom", name: "Pay what you want", hint: "Donations" },
];

function defaultPricing(mode: Pricing["mode"]): Pricing {
  switch (mode) {
    case "fixed":
      return { mode, amountMinor: 49900, itemLabel: "" };
    case "items":
      return {
        mode,
        items: [
          { id: newId(), label: "Item", priceMinor: 49900, maxQuantity: 10 },
        ],
      };
    case "tiers":
      return {
        mode,
        tiers: [
          { id: newId(), label: "Standard", priceMinor: 49900 },
          { id: newId(), label: "Premium", priceMinor: 99900 },
        ],
      };
    case "custom":
      return {
        mode,
        minMinor: 10000,
        maxMinor: 10000000,
        suggestedMinor: [50000, 100000, 250000],
      };
  }
}

/** Rupee input that keeps what the owner typed and reports whole paise. */
function MoneyInput({
  label,
  value,
  onChange,
  srOnlyLabel,
}: {
  label: string;
  value: number;
  onChange: (paise: number) => void;
  srOnlyLabel?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(paiseToRupeesInput(value));
  const invalid = rupeesToPaise(text) === null;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={
          srOnlyLabel ? "sr-only" : "text-xs font-medium text-fg-muted"
        }
      >
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-fg-muted"
        >
          ₹
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value);
            const paise = rupeesToPaise(e.target.value);
            if (paise !== null) onChange(paise);
          }}
          className={cx(small, "pl-7 tabular-nums")}
        />
      </div>
    </div>
  );
}

export function PaymentEditor({
  block,
  onChange,
  formId,
  coupons,
}: {
  block: BlockOf<"payment">;
  onChange: (b: Block) => void;
  formId: string;
  coupons: CouponRow[];
}) {
  const pricing = block.pricing;
  const set = (p: Pricing) => onChange({ ...block, pricing: p });
  const groupId = useId();

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend id={groupId} className="mb-2 text-xs font-medium text-fg-muted">
          How people pay
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <label
              key={m.mode}
              className={cx(
                "flex cursor-pointer flex-col rounded-input border px-3 py-2 has-focus-visible:outline-2 has-focus-visible:outline-focus",
                pricing.mode === m.mode
                  ? "border-accent bg-accent/10"
                  : "border-line hover:bg-surface-hover",
              )}
            >
              <input
                type="radio"
                name={`${groupId}-mode`}
                className="sr-only"
                checked={pricing.mode === m.mode}
                onChange={() => set(defaultPricing(m.mode))}
              />
              <span className="text-sm font-medium">{m.name}</span>
              <span className="text-xs text-fg-muted">{m.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {pricing.mode === "fixed" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            key={`fixed-${block.id}`}
            label="Amount"
            value={pricing.amountMinor}
            onChange={(amountMinor) => set({ ...pricing, amountMinor })}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${groupId}-what`}
              className="text-xs font-medium text-fg-muted"
            >
              What it&apos;s for (shown on the receipt)
            </label>
            <input
              id={`${groupId}-what`}
              value={pricing.itemLabel}
              onChange={(e) => set({ ...pricing, itemLabel: e.target.value })}
              placeholder={block.label}
              className={small}
            />
          </div>
        </div>
      )}

      {pricing.mode === "items" && (
        <ListEditor
          rows={pricing.items}
          addLabel="+ Add item"
          onAdd={() =>
            set({
              ...pricing,
              items: [
                ...pricing.items,
                {
                  id: newId(),
                  label: `Item ${pricing.items.length + 1}`,
                  priceMinor: 49900,
                  maxQuantity: 10,
                },
              ],
            })
          }
          onRemove={(id) =>
            set({ ...pricing, items: pricing.items.filter((i) => i.id !== id) })
          }
          render={(item) => (
            <div className="grid flex-1 grid-cols-[1fr_7rem] gap-2 sm:grid-cols-[1fr_7rem_5rem]">
              <input
                aria-label="Item name"
                value={item.label}
                onChange={(e) =>
                  set({
                    ...pricing,
                    items: pricing.items.map((i) =>
                      i.id === item.id ? { ...i, label: e.target.value } : i,
                    ),
                  })
                }
                className={small}
              />
              <MoneyInput
                srOnlyLabel
                label={`Price of ${item.label}`}
                value={item.priceMinor}
                onChange={(priceMinor) =>
                  set({
                    ...pricing,
                    items: pricing.items.map((i) =>
                      i.id === item.id ? { ...i, priceMinor } : i,
                    ),
                  })
                }
              />
              <input
                aria-label={`Most of ${item.label} per order`}
                type="number"
                min={1}
                max={1000}
                value={item.maxQuantity}
                onChange={(e) =>
                  set({
                    ...pricing,
                    items: pricing.items.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            maxQuantity: Math.max(
                              1,
                              Math.min(1000, Number(e.target.value) || 1),
                            ),
                          }
                        : i,
                    ),
                  })
                }
                className={cx(small, "col-span-2 sm:col-span-1")}
                title="Most per order"
              />
            </div>
          )}
        />
      )}

      {pricing.mode === "tiers" && (
        <ListEditor
          rows={pricing.tiers}
          addLabel="+ Add option"
          onAdd={() =>
            set({
              ...pricing,
              tiers: [
                ...pricing.tiers,
                {
                  id: newId(),
                  label: `Option ${pricing.tiers.length + 1}`,
                  priceMinor: 49900,
                },
              ],
            })
          }
          onRemove={(id) =>
            set({ ...pricing, tiers: pricing.tiers.filter((t) => t.id !== id) })
          }
          render={(tier) => (
            <div className="grid flex-1 grid-cols-[1fr_7rem] gap-2">
              <input
                aria-label="Option name"
                value={tier.label}
                onChange={(e) =>
                  set({
                    ...pricing,
                    tiers: pricing.tiers.map((t) =>
                      t.id === tier.id ? { ...t, label: e.target.value } : t,
                    ),
                  })
                }
                className={small}
              />
              <MoneyInput
                srOnlyLabel
                label={`Price of ${tier.label}`}
                value={tier.priceMinor}
                onChange={(priceMinor) =>
                  set({
                    ...pricing,
                    tiers: pricing.tiers.map((t) =>
                      t.id === tier.id ? { ...t, priceMinor } : t,
                    ),
                  })
                }
              />
            </div>
          )}
        />
      )}

      {pricing.mode === "custom" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput
              label="Minimum"
              value={pricing.minMinor}
              onChange={(minMinor) => set({ ...pricing, minMinor })}
            />
            <MoneyInput
              label="Maximum"
              value={pricing.maxMinor}
              onChange={(maxMinor) => set({ ...pricing, maxMinor })}
            />
          </div>
          <SuggestedAmounts
            values={pricing.suggestedMinor}
            onChange={(suggestedMinor) => set({ ...pricing, suggestedMinor })}
          />
        </div>
      )}

      <Switch
        checked={block.allowCoupons}
        onChange={(allowCoupons) => onChange({ ...block, allowCoupons })}
        label="Allow coupon codes"
        hint="Discounts are checked and applied on our server"
      />
      {block.allowCoupons && (
        <CouponManager formId={formId} coupons={coupons} />
      )}
    </div>
  );
}

function ListEditor<T extends { id: string }>({
  rows,
  render,
  onAdd,
  onRemove,
  addLabel,
}: {
  rows: T[];
  render: (row: T) => React.ReactNode;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2">
          {render(row)}
          <button
            type="button"
            aria-label="Remove"
            disabled={rows.length === 1}
            onClick={() => onRemove(row.id)}
            className="flex size-11 shrink-0 items-center justify-center rounded-input text-fg-muted hover:bg-surface-hover disabled:opacity-30"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="min-h-10 self-start rounded-input px-2 text-sm text-accent hover:underline"
      >
        {addLabel}
      </button>
    </div>
  );
}

function SuggestedAmounts({
  values,
  onChange,
}: {
  values: number[];
  onChange: (v: number[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState(values.map(paiseToRupeesInput).join(", "));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        Suggested amounts in ₹, separated by commas (up to 6)
      </label>
      <input
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = e.target.value
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map(rupeesToPaise);
          if (parsed.every((p) => p !== null))
            onChange((parsed as number[]).slice(0, 6));
        }}
        className={small}
      />
    </div>
  );
}

function CouponManager({
  formId,
  coupons,
}: {
  formId: string;
  coupons: CouponRow[];
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <div className="flex flex-col gap-3 rounded-input border border-line p-3">
      <p className="text-xs font-medium text-fg-muted">Coupons for this form</p>
      {coupons.length > 0 && (
        <ul className="flex flex-col gap-1">
          {coupons.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-input bg-surface px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{c.code}</span>{" "}
                <span className="text-fg-muted">
                  {c.type === "percent"
                    ? `${c.value / 100}% off`
                    : `${formatPaise(c.value)} off`}{" "}
                  · used {c.used}
                  {c.maxUses ? ` of ${c.maxUses}` : ""}
                  {c.expiresAt
                    ? ` · until ${new Date(c.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Delete coupon ${c.code}`}
                onClick={() =>
                  startTransition(
                    async () => void (await deleteCouponAction(formId, c.id)),
                  )
                }
                className="min-h-9 rounded-input px-2 text-danger hover:bg-surface-hover"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input
          aria-label="Coupon code"
          placeholder="CODE"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className={cx(small, "col-span-2 uppercase sm:col-span-1")}
        />
        <select
          aria-label="Discount type"
          value={type}
          onChange={(e) => setType(e.target.value as "percent" | "fixed")}
          className={small}
        >
          <option value="percent">% off</option>
          <option value="fixed">₹ off</option>
        </select>
        <input
          aria-label={type === "percent" ? "Percent off" : "Rupees off"}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={small}
        />
        <input
          aria-label="Maximum uses (optional)"
          placeholder="Max uses"
          inputMode="numeric"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          className={small}
        />
        <input
          aria-label="Valid until (optional)"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className={small}
        />
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        pending={pending}
        disabled={code.length < 2}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createCouponAction(formId, {
              code,
              type,
              value,
              maxUses: maxUses || undefined,
              expiresAt: expiresAt || undefined,
            });
            if (result.ok) {
              toast.show(`Coupon ${code} created`);
              setCode("");
            } else setError(result.message);
          })
        }
      >
        Add coupon
      </Button>
    </div>
  );
}
