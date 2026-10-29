import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "./cx";
import { controlClasses, Field, fieldDescribedBy } from "./field";

type InputProps = Omit<ComponentProps<"input">, "children"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

/** Text input with its label above (DESIGN.md section 5: 48px tall, 12px radius). */
export function Input({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(inputId, hint, error)}
        className={cx(controlClasses, className)}
        {...props}
      />
    </Field>
  );
}
