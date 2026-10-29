import type { ReactNode } from "react";

// Shared label / hint / error layout for Input and Select. The error is text in
// the normal colour behind a danger border, so it never relies on colour alone.

export type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

export function fieldDescribedBy(id: string, hint?: unknown, error?: unknown) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null];
  return ids.filter(Boolean).join(" ") || undefined;
}

export const controlClasses =
  "min-h-12 w-full rounded-button border border-line-strong bg-surface px-4 text-base text-fg " +
  "placeholder:text-fg-placeholder transition-colors " +
  "focus-visible:border-focus aria-invalid:border-danger aria-invalid:border-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="border-l-2 border-danger pl-2 text-sm text-fg"
        >
          {error}
        </p>
      )}
    </div>
  );
}
