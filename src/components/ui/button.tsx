import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-button px-6 py-2 text-base font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

// DESIGN.md section 5. Primary: ink fill, canvas text (1px canvas border on
// dark). Secondary: transparent with a 1px border. Ghost: text only, for
// low-emphasis actions such as "Dismiss".
const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-primary-border bg-primary text-primary-fg hover:opacity-90",
  secondary:
    "border border-line-strong bg-transparent text-fg hover:bg-surface-alt",
  ghost: "bg-transparent text-fg underline-offset-4 hover:underline",
};

/** Button classes, for links that should look like buttons. */
export function buttonClasses({
  variant = "primary",
  fullWidth = false,
  className,
}: { variant?: ButtonVariant; fullWidth?: boolean; className?: string } = {}) {
  return cx(base, variants[variant], fullWidth && "w-full", className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  /** Shows the label with a busy state and blocks repeat clicks. */
  pending?: boolean;
};

export function Button({
  variant,
  fullWidth,
  pending = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={buttonClasses({ variant, fullWidth, className })}
      {...props}
    >
      {children}
    </button>
  );
}
