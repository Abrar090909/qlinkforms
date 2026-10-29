import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { listForms } from "@/server/forms";
import { NewFormButton } from "../forms/new-form-button";

export const metadata: Metadata = { title: "Dashboard" };

const statusLabel = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
} as const;

const updatedFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Suspense fallback={<p className="text-fg-muted">Loading forms…</p>}>
        <Forms />
      </Suspense>
    </div>
  );
}

async function Forms() {
  const user = await requireUser();
  const forms = await listForms(user);

  if (forms.length === 0) {
    return (
      <>
        <h1 className="text-2xl font-semibold">Forms</h1>
        <EmptyState
          title="Create your first form"
          description="Build a form, share the link, and collect UPI, card or netbanking payments straight into your own Razorpay account."
          action={<NewFormButton />}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Forms</h1>
        <NewFormButton />
      </div>
      <ul className="flex flex-col gap-2">
        {forms.map((form) => (
          <li key={form.id}>
            <Link
              href={`/forms/${form.id}/edit`}
              className="flex flex-col gap-1 rounded-card border border-transparent bg-surface px-6 py-4 no-underline transition-colors hover:border-line sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium break-words">{form.title}</span>
              <span className="text-sm text-fg-muted">
                {statusLabel[form.status]} · Updated{" "}
                {updatedFormat.format(form.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
