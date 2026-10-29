const styles = {
  draft: { dot: "bg-fg-muted", label: "Draft" },
  published: { dot: "bg-success", label: "Live" },
  archived: { dot: "bg-fg-subtle", label: "Archived" },
  completed: { dot: "bg-fg-muted", label: "Submitted" },
  paid: { dot: "bg-success", label: "Paid" },
  pending_payment: { dot: "bg-warning", label: "Pending" },
  payment_failed: { dot: "bg-danger", label: "Failed" },
} as const;

export type PillStatus = keyof typeof styles;

/** Dot plus text, so status never relies on colour alone (DESIGN.md section 5). */
export function StatusPill({ status }: { status: PillStatus }) {
  const s = styles[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-line px-2.5 py-1 text-xs font-medium">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
