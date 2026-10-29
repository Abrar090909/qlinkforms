import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "./cx";
import { controlClasses, Field, fieldDescribedBy } from "./field";

type SelectProps = ComponentProps<"select"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

/**
 * Native select styled like Input. Native keeps keyboard, screen reader and
 * mobile picker behaviour for free.
 */
export function Select({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <Field id={selectId} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(selectId, hint, error)}
          className={cx(
            controlClasses,
            "min-h-12 appearance-none pr-12",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-fg-muted"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Field>
  );
}
