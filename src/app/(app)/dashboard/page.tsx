import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireUser } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { listForms } from "@/server/forms";
import { getPaymentAccountView } from "@/server/payments/accounts";
import { serverEnv } from "@/lib/env";
import { FormCardMenu } from "../forms/form-card-menu";
import { NewFormButton, TemplateGrid } from "../forms/new-form-button";

export const metadata: Metadata = { title: "Forms" };

const updatedFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Forms />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="h-10 w-40 animate-pulse rounded-input bg-surface" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    </div>
  );
}

async function Forms() {
  const user = await requireUser();
  const [forms, payments] = await Promise.all([
    listForms(user),
    getPaymentAccountView(user, serverEnv.SITE_URL),
  ]);
  const totalResponses = forms.reduce((n, f) => n + f.responses, 0);
  const totalRevenue = forms.reduce((n, f) => n + f.revenueMinor, 0);

  if (forms.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-normal tracking-tight">Forms</h1>
        <EmptyState
          title="Create your first form"
          description="Pick a template or start blank. Share the link, and collect UPI, card or netbanking payments straight into your own Razorpay account."
        >
          <div className="mx-auto max-w-2xl text-left">
            <TemplateGrid />
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow text-fg-muted uppercase">Workspace</p>
          <h1 className="text-3xl font-normal tracking-tight">Forms</h1>
        </div>
        <NewFormButton />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Forms" value={String(forms.length)} />
        <Stat
          label="Responses"
          value={totalResponses.toLocaleString("en-IN")}
        />
        <Stat
          label="Collected"
          value={formatPaise(totalRevenue)}
          className="col-span-2 sm:col-span-1"
        />
      </dl>

      {!payments.connected && (
        <div className="glass flex flex-col gap-3 rounded-card border-l-4 border-l-accent p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-medium">
              Connect Razorpay to take payments.
            </span>{" "}
            <span className="text-fg-muted">
              Money goes straight to your own account.
            </span>
          </p>
          <Link
            href="/settings"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Connect now →
          </Link>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <li
            key={form.id}
            className="glass group relative flex flex-col gap-4 rounded-card p-5 transition-colors hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <StatusPill status={form.status} />
              <FormCardMenu
                formId={form.id}
                status={form.status}
                slug={form.slug}
              />
            </div>
            <Link
              href={`/forms/${form.id}/edit`}
              className="after:absolute after:inset-0 after:rounded-card"
            >
              <h2 className="line-clamp-2 text-lg font-medium break-words">
                {form.title}
              </h2>
            </Link>
            <div className="mt-auto flex items-center justify-between gap-2 text-sm text-fg-muted">
              <span>
                {form.responses}{" "}
                {form.responses === 1 ? "response" : "responses"}
                {form.revenueMinor > 0 &&
                  ` · ${formatPaise(form.revenueMinor)}`}
              </span>
              <span>{updatedFormat.format(form.updatedAt)}</span>
            </div>
            <Link
              href={`/forms/${form.id}/responses`}
              className="relative z-10 self-start text-sm text-accent underline-offset-4 hover:underline"
            >
              View responses
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`glass flex flex-col gap-1 rounded-card p-5 ${className}`}>
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-2xl font-normal tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}
