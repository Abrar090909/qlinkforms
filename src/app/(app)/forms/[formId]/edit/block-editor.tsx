"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { controlClasses } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { blockMeta } from "@/lib/forms/blocks";
import {
  type Block,
  type BlockOf,
  newId,
  RULE_OPS,
  type VisibilityRule,
} from "@/lib/forms/schema";
import { BlockIcon } from "./block-icon";
import { type CouponRow, PaymentEditor } from "./payment-editor";

type Props = {
  block: Block;
  index: number;
  count: number;
  earlier: Block[];
  selected: boolean;
  error?: string;
  formId: string;
  coupons: CouponRow[];
  onSelect: () => void;
  onChange: (block: Block) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const small = cx(controlClasses, "min-h-11 text-sm");

export function BlockEditor(props: Props) {
  const { block, selected, onSelect, onChange, error } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const meta = blockMeta(block.type);
  const labelId = useId();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "group relative rounded-card border transition-colors",
        selected
          ? "border-accent/60 bg-surface"
          : "border-transparent hover:border-line hover:bg-surface",
        isDragging && "z-20 opacity-80",
        error && !selected && "border-danger/60",
      )}
    >
      <div className="flex items-start gap-1 p-3 sm:p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder: ${block.label}`}
          className="mt-1 hidden size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-input text-fg-subtle hover:bg-surface-hover hover:text-fg sm:flex"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="currentColor"
          >
            {[4, 8, 12].flatMap((y) =>
              [6, 10].map((x) => (
                <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" />
              )),
            )}
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs text-fg-muted">
            <BlockIcon type={block.type} className="size-4" />
            <span>{meta.name}</span>
            {block.required && (
              <span className="rounded-pill border border-line px-1.5">
                Required
              </span>
            )}
            {block.visibility && (
              <span className="rounded-pill border border-line px-1.5">
                Conditional
              </span>
            )}
          </div>
          <label htmlFor={labelId} className="sr-only">
            {block.type === "statement" ? "Heading" : "Question"}
          </label>
          <input
            id={labelId}
            value={block.label}
            onFocus={onSelect}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder={
              block.type === "statement" ? "Heading" : "Ask a question"
            }
            className={cx(
              "w-full bg-transparent py-1 font-normal tracking-tight placeholder:text-fg-subtle focus-visible:outline-none",
              block.type === "statement" ? "text-2xl" : "text-xl",
            )}
          />
          {error && (
            <p className="mt-1 border-l-2 border-danger pl-2 text-sm">
              {error}
            </p>
          )}
          {!selected && (
            <button
              type="button"
              onClick={onSelect}
              className="mt-1 text-sm text-fg-muted underline-offset-4 hover:underline"
            >
              Edit settings
            </button>
          )}
          {selected && <Settings {...props} />}
        </div>
      </div>
    </div>
  );
}

function Settings({
  block,
  index,
  count,
  earlier,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  formId,
  coupons,
}: Props) {
  const descId = useId();
  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={descId} className="text-xs font-medium text-fg-muted">
          {block.type === "statement" ? "Text" : "Help text (optional)"}
        </label>
        <textarea
          id={descId}
          rows={2}
          value={block.description ?? ""}
          onChange={(e) =>
            onChange({ ...block, description: e.target.value || undefined })
          }
          className={cx(small, "py-2")}
        />
      </div>

      <TypeSettings
        block={block}
        onChange={onChange}
        formId={formId}
        coupons={coupons}
      />

      {block.type !== "statement" &&
        !(block.type === "payment" && block.pricing.mode === "fixed") && (
          <Switch
            checked={block.required}
            onChange={(required) => onChange({ ...block, required } as Block)}
            label="Required"
          />
        )}

      <VisibilityEditor block={block} earlier={earlier} onChange={onChange} />

      <div className="flex flex-wrap gap-1 border-t border-line pt-3">
        <ToolButton onClick={() => onMove(-1)} disabled={index === 0}>
          ↑ Move up
        </ToolButton>
        <ToolButton onClick={() => onMove(1)} disabled={index === count - 1}>
          ↓ Move down
        </ToolButton>
        {block.type !== "payment" && (
          <ToolButton onClick={onDuplicate}>Duplicate</ToolButton>
        )}
        <ToolButton onClick={onDelete} danger>
          Delete
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "min-h-9 rounded-input px-3 text-sm hover:bg-surface-hover disabled:opacity-40",
        danger ? "text-danger" : "text-fg-muted",
      )}
    >
      {children}
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        className={small}
      />
    </div>
  );
}

function TypeSettings({
  block,
  onChange,
  formId,
  coupons,
}: {
  block: Block;
  onChange: (b: Block) => void;
  formId: string;
  coupons: CouponRow[];
}) {
  switch (block.type) {
    case "short_text":
    case "long_text":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextSetting
            label="Placeholder"
            value={block.placeholder ?? ""}
            onChange={(placeholder) =>
              onChange({ ...block, placeholder: placeholder || undefined })
            }
          />
          <NumberInput
            label="Max characters"
            min={1}
            value={block.maxLength}
            onChange={(v) =>
              onChange({
                ...block,
                maxLength: Math.max(
                  1,
                  Math.min(block.type === "short_text" ? 1000 : 10000, v ?? 1),
                ),
              })
            }
          />
        </div>
      );
    case "number":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberInput
            label="Minimum"
            value={block.min}
            onChange={(min) => onChange({ ...block, min })}
          />
          <NumberInput
            label="Maximum"
            value={block.max}
            onChange={(max) => onChange({ ...block, max })}
          />
          <div className="flex items-end">
            <Switch
              checked={block.integer}
              onChange={(integer) => onChange({ ...block, integer })}
              label="Whole numbers"
            />
          </div>
        </div>
      );
    case "rating":
      return (
        <NumberInput
          label="Highest rating (3 to 10)"
          min={3}
          value={block.max}
          onChange={(v) =>
            onChange({ ...block, max: Math.max(3, Math.min(10, v ?? 5)) })
          }
        />
      );
    case "dropdown":
    case "single_choice":
    case "multi_choice":
      return (
        <div className="flex flex-col gap-3">
          <OptionsEditor block={block} onChange={onChange} />
          {block.type === "multi_choice" && (
            <NumberInput
              label="Most choices allowed (optional)"
              min={1}
              value={block.maxSelections}
              onChange={(v) =>
                onChange({
                  ...block,
                  maxSelections: v ? Math.max(1, v) : undefined,
                })
              }
            />
          )}
        </div>
      );
    case "payment":
      return (
        <PaymentEditor
          block={block}
          onChange={onChange}
          formId={formId}
          coupons={coupons}
        />
      );
    default:
      return null;
  }
}

function TextSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={small}
      />
    </div>
  );
}

function OptionsEditor({
  block,
  onChange,
}: {
  block: BlockOf<"dropdown" | "single_choice" | "multi_choice">;
  onChange: (b: Block) => void;
}) {
  const set = (options: typeof block.options) =>
    onChange({ ...block, options });
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-xs font-medium text-fg-muted">
        Options
      </legend>
      {block.options.map((option, i) => (
        <div key={option.id} className="flex items-center gap-2">
          <input
            aria-label={`Option ${i + 1}`}
            value={option.label}
            onChange={(e) =>
              set(
                block.options.map((o) =>
                  o.id === option.id ? { ...o, label: e.target.value } : o,
                ),
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = [...block.options];
                next.splice(i + 1, 0, {
                  id: newId(),
                  label: `Option ${block.options.length + 1}`,
                });
                set(next);
              }
            }}
            className={small}
          />
          <button
            type="button"
            aria-label={`Remove option ${option.label}`}
            disabled={block.options.length === 1}
            onClick={() => set(block.options.filter((o) => o.id !== option.id))}
            className="flex size-11 shrink-0 items-center justify-center rounded-input text-fg-muted hover:bg-surface-hover disabled:opacity-30"
          >
            ×
          </button>
        </div>
      ))}
      {block.options.length < 50 && (
        <button
          type="button"
          onClick={() =>
            set([
              ...block.options,
              { id: newId(), label: `Option ${block.options.length + 1}` },
            ])
          }
          className="min-h-10 self-start rounded-input px-2 text-sm text-accent hover:underline"
        >
          + Add option
        </button>
      )}
    </fieldset>
  );
}

const opLabels: Record<(typeof RULE_OPS)[number], string> = {
  equals: "is",
  not_equals: "is not",
  includes: "includes",
  is_answered: "is answered",
  is_not_answered: "is not answered",
};

function VisibilityEditor({
  block,
  earlier,
  onChange,
}: {
  block: Block;
  earlier: Block[];
  onChange: (b: Block) => void;
}) {
  const candidates = earlier.filter(
    (b) => b.type !== "statement" && b.type !== "payment",
  );
  const rule = block.visibility;
  const set = (visibility: VisibilityRule | null) =>
    onChange({ ...block, visibility } as Block);
  const target = candidates.find((b) => b.id === rule?.fieldId);
  const needsValue =
    rule && rule.op !== "is_answered" && rule.op !== "is_not_answered";

  if (candidates.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <Switch
        checked={Boolean(rule)}
        onChange={(on) =>
          set(
            on
              ? {
                  fieldId: candidates[candidates.length - 1]!.id,
                  op: "is_answered",
                }
              : null,
          )
        }
        label="Show only when…"
        hint="Hide this unless an earlier answer matches"
      />
      {rule && (
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            aria-label="Question"
            value={rule.fieldId}
            onChange={(e) =>
              set({ fieldId: e.target.value, op: "is_answered" })
            }
            className={small}
          >
            {candidates.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label || "Untitled question"}
              </option>
            ))}
          </select>
          <select
            aria-label="Condition"
            value={rule.op}
            onChange={(e) =>
              set({ ...rule, op: e.target.value as VisibilityRule["op"] })
            }
            className={small}
          >
            {RULE_OPS.filter(
              (op) =>
                op !== "includes" ||
                target?.type === "multi_choice" ||
                target?.type === "short_text" ||
                target?.type === "long_text",
            ).map((op) => (
              <option key={op} value={op}>
                {opLabels[op]}
              </option>
            ))}
          </select>
          {needsValue &&
            (target && "options" in target ? (
              <select
                aria-label="Value"
                value={rule.value ?? ""}
                onChange={(e) => set({ ...rule, value: e.target.value })}
                className={small}
              >
                <option value="">Choose…</option>
                {target.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Value"
                value={rule.value ?? ""}
                onChange={(e) => set({ ...rule, value: e.target.value })}
                className={small}
              />
            ))}
        </div>
      )}
    </div>
  );
}
