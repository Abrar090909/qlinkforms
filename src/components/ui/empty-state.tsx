import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** One action only (DESIGN.md section 5). */
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
  children?: ReactNode;
};

/** Glass panel with a soft copper glow and a single action. */
export function EmptyState({
  title,
  description,
  action,
  headingLevel: Heading = "h2",
  children,
}: EmptyStateProps) {
  return (
    <div className="glass relative flex flex-col items-center gap-4 overflow-hidden rounded-panel px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(222_125_77/0.25),transparent_70%)]"
      />
      <Heading className="relative text-2xl font-normal tracking-tight">
        {title}
      </Heading>
      {description && (
        <p className="relative max-w-md text-base text-fg-muted">
          {description}
        </p>
      )}
      {action && <div className="relative mt-2">{action}</div>}
      {children && <div className="relative mt-6 w-full">{children}</div>}
    </div>
  );
}
