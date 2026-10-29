import type { ReactNode } from "react";

// Shared label / hint / error layout for Input, Textarea and Select. The error
// is normal-colour text behind a danger border, so it never relies on colour.

export type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
};

export function fieldDescribedBy(id: string, hint?: unknown, error?: unknown) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null];
  return ids.filter(Boolean).join(" ") || undefined;
}

export const controlClasses =
  "w-full rounded-input border border-line-strong bg-surface-solid px-4 text-base text-fg " +
  "placeholder:text-fg-subtle transition-colors " +
  "focus-visible:border-accent aria-invalid:border-danger " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-fg-muted" aria-hidden="true">
            {" *"}
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="border-l-2 border-danger pl-2 text-sm text-fg">
      {children}
    </p>
  );
}
