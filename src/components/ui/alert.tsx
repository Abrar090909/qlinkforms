import type { ReactNode } from "react";

/**
 * Form-level error message. Announced to screen readers, and marked with a
 * danger border plus text so it doesn't rely on colour alone.
 */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-image border-l-4 border-danger bg-surface-alt px-4 py-3 text-sm text-fg"
    >
      {children}
    </p>
  );
}
