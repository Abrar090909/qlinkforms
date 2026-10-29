import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "./cx";
import { controlClasses, Field, fieldDescribedBy } from "./field";

type InputProps = Omit<ComponentProps<"input">, "children"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

/** Text input with its label above (DESIGN.md section 5: 48px, 12px radius). */
export function Input({
  label,
  hint,
  error,
  id,
  className,
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(inputId, hint, error)}
        className={cx(controlClasses, "min-h-12", className)}
        {...props}
      />
    </Field>
  );
}

type TextareaProps = Omit<ComponentProps<"textarea">, "children"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <textarea
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(inputId, hint, error)}
        className={cx(controlClasses, "py-3", className)}
        {...props}
      />
    </Field>
  );
}
