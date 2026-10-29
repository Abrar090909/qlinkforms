"use client";

import { type FormEvent, useId, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { controlClasses, FieldError } from "@/components/ui/field";
import {
  type Answers,
  type AnswerValue,
  validateAnswers,
  visibleBlockIds,
} from "@/lib/forms/answers";
import {
  type AppliedCoupon,
  computePrice,
  type PaymentAnswer,
  type PriceBreakdown,
} from "@/lib/forms/pricing";
import { findPaymentBlock } from "@/lib/forms/helpers";
import type { Block, BlockOf, FormSchema } from "@/lib/forms/schema";
import { formatPaise, paiseToRupeesInput, rupeesToPaise } from "@/lib/money";

// The respondent-facing form. Used live on /f/[slug] and as the builder's
// preview, so owners see exactly what respondents get. No animation library:
// the public page stays under its JavaScript budget (DESIGN.md section 8).

export type SubmitFeedback = {
  errors?: Record<string, string>;
  message?: string;
};

type Props = {
  schema: FormSchema;
  /** Builder preview: validate only, never submit. */
  preview?: boolean;
  onSubmit?: (
    answers: Answers,
    breakdown: PriceBreakdown | null,
  ) => Promise<SubmitFeedback | void>;
  applyCoupon?: (
    code: string,
  ) => Promise<
    { ok: true; coupon: AppliedCoupon } | { ok: false; message: string }
  >;
};

export function FormRenderer({
  schema,
  preview = false,
  onSubmit,
  applyCoupon,
}: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [previewDone, setPreviewDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const visible = useMemo(
    () => visibleBlockIds(schema, answers),
    [schema, answers],
  );
  const paymentBlock = findPaymentBlock(schema);
  const paymentVisible = paymentBlock ? visible.has(paymentBlock.id) : false;
  const price = useMemo(() => {
    if (!paymentBlock || !paymentVisible) return null;
    const answer =
      (answers[paymentBlock.id] as PaymentAnswer | undefined) ?? {};
    return computePrice(paymentBlock, answer, coupon);
  }, [paymentBlock, paymentVisible, answers, coupon]);
  const total = price?.ok ? price.breakdown.totalMinor : 0;

  function setAnswer(id: string, value: AnswerValue | undefined) {
    setAnswers((current) => ({ ...current, [id]: value }));
    if (errors[id]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const withCoupon = { ...answers };
    if (paymentBlock && coupon) {
      withCoupon[paymentBlock.id] = {
        ...((answers[paymentBlock.id] as PaymentAnswer) ?? {}),
        couponCode: coupon.code,
      };
    }
    const result = validateAnswers(schema, withCoupon);
    const priceError =
      price && !price.ok && paymentBlock
        ? { [paymentBlock.id]: price.error }
        : {};
    const allErrors = { ...(result.ok ? {} : result.errors), ...priceError };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Move focus to the first problem so keyboard and screen reader users find it.
      const first = schema.blocks.find((b) => allErrors[b.id]);
      if (first)
        formRef.current
          ?.querySelector<HTMLElement>(
            `[data-block="${first.id}"] input, [data-block="${first.id}"] textarea, [data-block="${first.id}"] select`,
          )
          ?.focus();
      return;
    }
    if (preview || !onSubmit || !result.ok) {
      setPreviewDone(true);
      return;
    }
    setSubmitting(true);
    try {
      const feedback = await onSubmit(
        result.answers,
        price?.ok ? price.breakdown : null,
      );
      if (feedback?.errors) setErrors(feedback.errors);
      if (feedback?.message) setFormError(feedback.message);
    } catch {
      setFormError(
        "Something went wrong. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const label =
    schema.settings.submitLabel ||
    (total > 0 ? `Pay ${formatPaise(total)}` : "Submit");
  const errorCount = Object.keys(errors).length;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-8"
    >
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-normal tracking-tight break-words sm:text-[44px] sm:leading-[1.05]">
          {schema.title}
        </h1>
        {schema.description && (
          <p className="text-lg whitespace-pre-line text-fg-muted">
            {schema.description}
          </p>
        )}
      </header>

      {schema.blocks.map((block) =>
        visible.has(block.id) ? (
          <div key={block.id} data-block={block.id}>
            {block.type === "payment" ? (
              <PaymentField
                block={block}
                value={answers[block.id] as PaymentAnswer | undefined}
                onChange={(v) => setAnswer(block.id, v)}
                error={errors[block.id]}
                breakdown={price?.ok ? price.breakdown : null}
                coupon={coupon}
                onCoupon={setCoupon}
                applyCoupon={preview ? undefined : applyCoupon}
              />
            ) : (
              <BlockField
                block={block}
                value={answers[block.id]}
                onChange={(v) => setAnswer(block.id, v)}
                error={errors[block.id]}
              />
            )}
          </div>
        ) : null,
      )}

      {errorCount > 0 && (
        <Alert>
          {errorCount === 1
            ? "One answer needs attention."
            : `${errorCount} answers need attention.`}
        </Alert>
      )}
      {formError && <Alert>{formError}</Alert>}
      {previewDone && (
        <Alert tone="success">
          Preview: everything checks out. Respondents would now{" "}
          {total > 0 ? "pay" : "submit"}.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" fullWidth pending={submitting}>
          {submitting
            ? total > 0
              ? "Opening payment…"
              : "Submitting…"
            : label}
        </Button>
        {total > 0 && (
          <p className="text-center text-sm text-fg-muted">
            Secure payment by Razorpay. UPI, cards and netbanking.
          </p>
        )}
      </div>
    </form>
  );
}

function Label({
  block,
  htmlFor,
  as: As = "label",
}: {
  block: Block;
  htmlFor?: string;
  as?: "label" | "legend";
}) {
  return (
    <As
      {...(As === "label" ? { htmlFor } : {})}
      className="text-lg font-medium"
    >
      {block.label}
      {block.required && <span className="text-fg-muted"> *</span>}
    </As>
  );
}

function Description({ block, id }: { block: Block; id: string }) {
  return block.description ? (
    <p id={id} className="text-sm whitespace-pre-line text-fg-muted">
      {block.description}
    </p>
  ) : null;
}

type FieldProps<T extends Block = Block> = {
  block: T;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  error?: string;
};

function BlockField({ block, value, onChange, error }: FieldProps) {
  const id = useId();
  const descId = `${id}-desc`;
  const errId = `${id}-err`;
  const describedBy =
    [block.description ? descId : null, error ? errId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const common = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": block.required || undefined,
  };

  if (block.type === "statement") {
    return (
      <div className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-2xl font-normal tracking-tight">{block.label}</h2>
        <Description block={block} id={descId} />
      </div>
    );
  }

  const text =
    typeof value === "string"
      ? value
      : value === undefined
        ? ""
        : String(value);

  if (
    block.type === "single_choice" ||
    block.type === "multi_choice" ||
    block.type === "rating"
  ) {
    return (
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      >
        <Label block={block} as="legend" />
        <Description block={block} id={descId} />
        {block.type === "rating" ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: block.max }, (_, i) => i + 1).map((n) => (
              <ChoiceTile
                key={n}
                name={id}
                type="radio"
                checked={value === n}
                onChange={() => onChange(n)}
                className="w-12 justify-center px-0"
                label={String(n)}
                ariaLabel={`${n} of ${block.max}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {block.options.map((option) => {
              const selected =
                block.type === "multi_choice"
                  ? Array.isArray(value) && value.includes(option.id)
                  : value === option.id;
              return (
                <ChoiceTile
                  key={option.id}
                  name={id}
                  type={block.type === "multi_choice" ? "checkbox" : "radio"}
                  checked={selected}
                  label={option.label}
                  onChange={() => {
                    if (block.type === "multi_choice") {
                      const current = Array.isArray(value)
                        ? (value as string[])
                        : [];
                      onChange(
                        selected
                          ? current.filter((v) => v !== option.id)
                          : [...current, option.id],
                      );
                    } else onChange(option.id);
                  }}
                />
              );
            })}
          </div>
        )}
        {error && <FieldError id={errId}>{error}</FieldError>}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Label block={block} htmlFor={id} />
      <Description block={block} id={descId} />
      {block.type === "long_text" ? (
        <textarea
          {...common}
          rows={4}
          maxLength={block.maxLength}
          value={text}
          placeholder={block.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cx(controlClasses, "py-3")}
        />
      ) : block.type === "dropdown" ? (
        <select
          {...common}
          value={text}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={cx(controlClasses, "min-h-12")}
        >
          <option value="">Choose…</option>
          {block.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={cx(controlClasses, "min-h-12")}
          {...inputAttributes(block)}
        />
      )}
      {error && <FieldError id={errId}>{error}</FieldError>}
    </div>
  );
}

function inputAttributes(block: Block) {
  switch (block.type) {
    case "email":
      return {
        type: "email",
        inputMode: "email" as const,
        autoComplete: "email",
        placeholder: "you@example.com",
      };
    case "phone":
      return {
        type: "tel",
        inputMode: "tel" as const,
        autoComplete: "tel",
        placeholder: "98765 43210",
      };
    case "number":
      return {
        type: "text",
        inputMode: (block.integer ? "numeric" : "decimal") as
          "numeric" | "decimal",
      };
    case "date":
      return { type: "date" };
    case "short_text":
      return {
        type: "text",
        maxLength: block.maxLength,
        placeholder: block.placeholder,
      };
    default:
      return { type: "text" };
  }
}

function ChoiceTile({
  name,
  type,
  checked,
  onChange,
  label,
  ariaLabel,
  className,
}: {
  name: string;
  type: "radio" | "checkbox";
  checked: boolean;
  onChange: () => void;
  label: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <label
      className={cx(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-input border px-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
        checked
          ? "border-accent bg-accent/10"
          : "border-line-strong bg-surface-solid hover:bg-surface-hover",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cx(
          "flex size-5 shrink-0 items-center justify-center border-2",
          type === "radio" ? "rounded-full" : "rounded-[6px]",
          checked ? "border-accent bg-accent" : "border-line-strong",
          ariaLabel && "hidden",
        )}
      >
        {checked && (
          <span
            className={cx(
              "bg-accent-fg",
              type === "radio"
                ? "size-2 rounded-full"
                : "size-2.5 rounded-[2px]",
            )}
          />
        )}
      </span>
      <span className="text-base">{label}</span>
    </label>
  );
}

function PaymentField({
  block,
  value,
  onChange,
  error,
  breakdown,
  coupon,
  onCoupon,
  applyCoupon,
}: {
  block: BlockOf<"payment">;
  value: PaymentAnswer | undefined;
  onChange: (value: PaymentAnswer) => void;
  error?: string;
  breakdown: PriceBreakdown | null;
  coupon: AppliedCoupon | null;
  onCoupon: (coupon: AppliedCoupon | null) => void;
  applyCoupon?: Props["applyCoupon"];
}) {
  const id = useId();
  const pricing = block.pricing;
  const answer = value ?? {};
  const [customText, setCustomText] = useState(
    answer.amountMinor !== undefined
      ? paiseToRupeesInput(answer.amountMinor)
      : "",
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="tile flex flex-col gap-5 rounded-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-medium">
          {block.label}
          {block.required && pricing.mode !== "fixed" && (
            <span className="text-fg-muted"> *</span>
          )}
        </h2>
        {block.description && (
          <p className="text-sm text-fg-muted">{block.description}</p>
        )}
      </div>

      {pricing.mode === "items" && (
        <ul className="flex flex-col gap-2">
          {pricing.items.map((item) => {
            const qty = answer.items?.[item.id] ?? 0;
            const set = (q: number) =>
              onChange({
                ...answer,
                items: {
                  ...answer.items,
                  [item.id]: Math.max(0, Math.min(item.maxQuantity, q)),
                },
              });
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-input border border-line px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{item.label}</p>
                  <p className="text-sm text-fg-muted">
                    {formatPaise(item.priceMinor)}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1"
                  role="group"
                  aria-label={`Quantity of ${item.label}`}
                >
                  <button
                    type="button"
                    onClick={() => set(qty - 1)}
                    disabled={qty === 0}
                    aria-label={`Remove one ${item.label}`}
                    className="flex size-11 items-center justify-center rounded-input border border-line-strong text-xl disabled:opacity-40"
                  >
                    −
                  </button>
                  <output
                    aria-live="polite"
                    className="w-8 text-center tabular-nums"
                  >
                    {qty}
                  </output>
                  <button
                    type="button"
                    onClick={() => set(qty + 1)}
                    disabled={qty >= item.maxQuantity}
                    aria-label={`Add one ${item.label}`}
                    className="flex size-11 items-center justify-center rounded-input border border-line-strong text-xl disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pricing.mode === "tiers" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{block.label}</legend>
          {pricing.tiers.map((tier) => (
            <label
              key={tier.id}
              className={cx(
                "flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-input border px-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                answer.tierId === tier.id
                  ? "border-accent bg-accent/10"
                  : "border-line-strong bg-surface-solid hover:bg-surface-hover",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`${id}-tier`}
                  checked={answer.tierId === tier.id}
                  onChange={() => onChange({ ...answer, tierId: tier.id })}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <span className="font-medium">{tier.label}</span>
              </span>
              <span className="tabular-nums">
                {formatPaise(tier.priceMinor)}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {pricing.mode === "custom" && (
        <div className="flex flex-col gap-3">
          {pricing.suggestedMinor.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Suggested amounts"
            >
              {pricing.suggestedMinor.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={answer.amountMinor === amount}
                  onClick={() => {
                    setCustomText(paiseToRupeesInput(amount));
                    onChange({ ...answer, amountMinor: amount });
                  }}
                  className={cx(
                    "min-h-11 rounded-pill border px-4 tabular-nums transition-colors",
                    answer.amountMinor === amount
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-line-strong hover:bg-surface-hover",
                  )}
                >
                  {formatPaise(amount)}
                </button>
              ))}
            </div>
          )}
          <label htmlFor={`${id}-amount`} className="text-sm font-medium">
            Amount in ₹ ({formatPaise(pricing.minMinor)} to{" "}
            {formatPaise(pricing.maxMinor)})
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-muted"
            >
              ₹
            </span>
            <input
              id={`${id}-amount`}
              inputMode="decimal"
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                const paise = rupeesToPaise(e.target.value);
                onChange({ ...answer, amountMinor: paise ?? undefined });
              }}
              className={cx(controlClasses, "min-h-12 pl-9 tabular-nums")}
            />
          </div>
        </div>
      )}

      {block.allowCoupons && applyCoupon !== undefined && (
        <CouponBox
          coupon={coupon}
          onCoupon={onCoupon}
          applyCoupon={applyCoupon}
        />
      )}
      {block.allowCoupons && applyCoupon === undefined && (
        <p className="text-sm text-fg-muted">
          Respondents can enter a coupon code here.
        </p>
      )}

      {breakdown && <Summary breakdown={breakdown} />}
      {error && <FieldError>{error}</FieldError>}
    </section>
  );
}

function CouponBox({
  coupon,
  onCoupon,
  applyCoupon,
}: {
  coupon: AppliedCoupon | null;
  onCoupon: (c: AppliedCoupon | null) => void;
  applyCoupon: NonNullable<Props["applyCoupon"]>;
}) {
  const id = useId();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-input border border-success/50 px-4 py-3 text-sm">
        <span>
          Coupon <strong>{coupon.code}</strong> applied
        </span>
        <button
          type="button"
          className="min-h-11 underline"
          onClick={() => onCoupon(null)}
        >
          Remove
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          className={cx(controlClasses, "min-h-11 uppercase")}
        />
        <Button
          variant="secondary"
          pending={busy}
          disabled={code.trim().length < 2}
          onClick={async () => {
            setBusy(true);
            setMessage(null);
            try {
              const r = await applyCoupon(code);
              if (r.ok) onCoupon(r.coupon);
              else setMessage(r.message);
            } catch {
              setMessage("Couldn't check the code. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Apply
        </Button>
      </div>
      {message && <FieldError>{message}</FieldError>}
    </div>
  );
}

function Summary({ breakdown }: { breakdown: PriceBreakdown }) {
  return (
    <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
      {breakdown.lines.map((line, i) => (
        <div key={i} className="flex justify-between gap-3">
          <dt className="break-words text-fg-muted">
            {line.label}
            {line.quantity > 1 && ` × ${line.quantity}`}
          </dt>
          <dd className="tabular-nums">{formatPaise(line.totalMinor)}</dd>
        </div>
      ))}
      {breakdown.discountMinor > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">Discount ({breakdown.couponCode})</dt>
          <dd className="tabular-nums">
            −{formatPaise(breakdown.discountMinor)}
          </dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-3 text-lg font-medium">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPaise(breakdown.totalMinor)}</dd>
      </div>
    </dl>
  );
}
