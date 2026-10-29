import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-button font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,filter,opacity] " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

// DESIGN.md section 5. Primary: copper fill with dark text (white on copper is
// only 2.9:1). Secondary: tile. Ghost: text only.
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-85",
  secondary: "tile text-fg hover:border-line-strong hover:bg-surface-hover",
  ghost: "bg-transparent text-fg hover:bg-surface-hover",
  danger:
    "border border-danger/60 bg-transparent text-danger hover:bg-danger/10",
};

// md and lg keep a 44px touch target. sm is for dense desktop toolbars only.
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-13 px-7 text-lg",
};

/** Button classes, for links that should look like buttons. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  pill = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  pill?: boolean;
  className?: string;
} = {}) {
  return cx(
    base,
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    pill && "rounded-pill",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  pill?: boolean;
  /** Shows a spinner and blocks repeat clicks. */
  pending?: boolean;
};

export function Button({
  variant,
  size,
  fullWidth,
  pill,
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
      className={buttonClasses({ variant, size, fullWidth, pill, className })}
      {...props}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cx("size-4 animate-spin", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
