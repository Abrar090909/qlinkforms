"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { TEMPLATES } from "@/lib/forms/templates";
import { createForm } from "./actions";

/** "New form": pick a template or start blank (technical plan: template-first). */
export function NewFormButton({
  label = "New form",
  size = "md",
}: {
  label?: string;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Start a new form"
        size="lg"
        actions={
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        }
      >
        <TemplateGrid />
      </Dialog>
    </>
  );
}

export function TemplateGrid() {
  const [state, action, pending] = useActionState(createForm, undefined);
  const [chosen, setChosen] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => {
    if (state?.error) toast.show(state.error);
  }, [state, toast]);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <TemplateTile
        id=""
        name="Blank form"
        summary="Start from scratch"
        pending={pending && chosen === ""}
        disabled={pending}
        onPick={setChosen}
        highlight
      />
      {TEMPLATES.map((t) => (
        <TemplateTile
          key={t.id}
          id={t.id}
          name={t.name}
          summary={t.summary}
          tag={t.category}
          pending={pending && chosen === t.id}
          disabled={pending}
          onPick={setChosen}
        />
      ))}
    </form>
  );
}

function TemplateTile({
  id,
  name,
  summary,
  tag,
  pending,
  disabled,
  onPick,
  highlight,
}: {
  id: string;
  name: string;
  summary: string;
  tag?: string;
  pending: boolean;
  disabled: boolean;
  onPick: (id: string) => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="submit"
      name="templateId"
      value={id}
      disabled={disabled}
      onClick={() => onPick(id)}
      aria-busy={pending || undefined}
      className={`flex min-h-20 flex-col items-start gap-1 rounded-card border p-4 text-left transition-colors disabled:opacity-60 ${highlight ? "border-accent/60 bg-accent/10 hover:bg-accent/15" : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"}`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="font-medium">{pending ? "Creating…" : name}</span>
        {tag && (
          <span className="rounded-pill border border-line px-2 py-0.5 text-xs text-fg-muted">
            {tag}
          </span>
        )}
      </span>
      <span className="text-sm text-fg-muted">{summary}</span>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
