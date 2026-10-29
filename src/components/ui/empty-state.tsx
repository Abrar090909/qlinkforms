import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** One action only (DESIGN.md section 5). */
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
};

/** Plain text on surface-alt with a single action. */
export function EmptyState({
  title,
  description,
  action,
  headingLevel: Heading = "h2",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-surface-alt px-6 py-12 text-center">
      <Heading className="text-xl font-semibold">{title}</Heading>
      {description && (
        <p className="max-w-md text-base text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
