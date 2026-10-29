import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** One action only (DESIGN.md section 5). */
  action?: ReactNode;
  headingLevel?: "h2" | "h3";
  children?: ReactNode;
};

/** Tile with a title, one line of text and a single action. */
export function EmptyState({
  title,
  description,
  action,
  headingLevel: Heading = "h2",
  children,
}: EmptyStateProps) {
  return (
    <div className="tile flex flex-col items-center gap-3 rounded-panel px-6 py-14 text-center">
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
