import type { ReactNode } from "react";

const borders = {
  error: "border-danger",
  info: "border-accent",
  success: "border-success",
} as const;

/**
 * Form-level message. Errors are announced to screen readers and marked with a
 * coloured border plus text, so they don't rely on colour alone.
 */
export function Alert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: keyof typeof borders;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`tile rounded-input border-l-4 ${borders[tone]} px-4 py-3 text-sm text-fg`}
    >
      {children}
    </div>
  );
}
