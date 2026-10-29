/** Placeholder mark until the brand is chosen (DESIGN.md open decision 1). */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path
        d="M10 9v8a6 6 0 0 0 12 0V9"
        fill="none"
        stroke="var(--color-accent-fg)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M16 23v-6"
        stroke="var(--color-accent-fg)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
