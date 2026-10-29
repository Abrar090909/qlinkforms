import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { buttonClasses } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { controlClasses } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireUser } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import {
  listResponses,
  RESPONSE_STATUSES,
  type ResponseStatus,
} from "@/server/responses";
import { DeleteResponseButton } from "./delete-response";

export const metadata: Metadata = { title: "Responses" };

const when = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const filterLabels: Record<ResponseStatus | "all", string> = {
  all: "All",
  paid: "Paid",
  completed: "Submitted",
  pending_payment: "Pending",
  payment_failed: "Failed",
};

export default function ResponsesPage(
  props: PageProps<"/forms/[formId]/responses">,
) {
  return (
    <Suspense fallback={<p className="text-fg-muted">Loading responses…</p>}>
      <Responses {...props} />
    </Suspense>
  );
}

async function Responses({
  params,
  searchParams,
}: PageProps<"/forms/[formId]/responses">) {
  const { formId } = await params;
  if (!z.uuid().safeParse(formId).success) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const statusParam = typeof sp.status === "string" ? sp.status : "";
  const status = (RESPONSE_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as ResponseStatus)
    : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;

  const user = await requireUser();
  const data = await listResponses(user, formId, { q, status, page });
  if (!data) notFound();
  const { form, rows, columns, summary } = data;
  const qs = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: q || undefined,
      status,
      page: undefined,
      ...overrides,
    } as Record<string, string | number | undefined>;
    for (const [k, v] of Object.entries(merged))
      if (v !== undefined && v !== "") p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Link
            href="/dashboard"
            className="text-sm text-fg-muted hover:text-fg"
          >
            ← Forms
          </Link>
          <h1 className="truncate text-3xl font-normal tracking-tight">
            {form.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/forms/${form.id}/edit`}
            className={buttonClasses({ variant: "secondary" })}
          >
            Edit form
          </Link>
          <a
            href={`/forms/${form.id}/responses/export`}
            className={buttonClasses({ variant: "secondary" })}
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Responses"
          value={summary.responses.toLocaleString("en-IN")}
        />
        {form.hasPayment && (
          <Stat label="Collected" value={formatPaise(summary.paidMinor)} />
        )}
        {form.hasPayment && (
          <Stat label="Pending payments" value={String(summary.pending)} />
        )}
      </dl>

      <form
        role="search"
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        action=""
      >
        <label htmlFor="q" className="sr-only">
          Search responses
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Search answers or email"
          className={cx(controlClasses, "min-h-11 sm:max-w-sm")}
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className={buttonClasses({ variant: "secondary" })}
        >
          Search
        </button>
      </form>
      <nav aria-label="Filter by status" className="-mt-4 flex flex-wrap gap-2">
        {(["all", ...RESPONSE_STATUSES] as const).map((s) => {
          const active = (s === "all" && !status) || s === status;
          return (
            <Link
              key={s}
              href={qs({ status: s === "all" ? undefined : s })}
              aria-current={active ? "page" : undefined}
              className={cx(
                "inline-flex min-h-10 items-center rounded-pill border px-4 text-sm",
                active
                  ? "border-accent bg-accent/10"
                  : "border-line text-fg-muted hover:text-fg",
              )}
            >
              {filterLabels[s]}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title={q || status ? "Nothing matches" : "No responses yet"}
          description={
            q || status
              ? "Try a different search or filter."
              : form.status === "published"
                ? "Share your form link to start collecting responses."
                : "Publish your form, then share the link."
          }
          action={
            !(q || status) ? (
              <Link href={`/forms/${form.id}/edit`} className={buttonClasses()}>
                {form.status === "published" ? "Share form" : "Publish form"}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const headline =
              columns.map((c) => row.cells[c.id]).find(Boolean) ??
              row.email ??
              row.receipt;
            return (
              <li key={row.id}>
                <details className="glass group rounded-card">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <StatusPill status={row.status} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {headline}
                    </span>
                    {row.amountMinor > 0 && (
                      <span className="hidden text-sm tabular-nums sm:inline">
                        {formatPaise(row.amountMinor)}
                      </span>
                    )}
                    <time
                      dateTime={row.createdAt}
                      className="hidden text-sm text-fg-muted md:inline"
                    >
                      {when.format(new Date(row.createdAt))}
                    </time>
                    <span
                      aria-hidden="true"
                      className="text-fg-muted transition-transform group-open:rotate-180"
                    >
                      ⌄
                    </span>
                  </summary>
                  <div className="flex flex-col gap-4 border-t border-line px-4 py-4 sm:px-5">
                    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {columns.map((c) =>
                        row.cells[c.id] ? (
                          <div key={c.id} className="min-w-0">
                            <dt className="text-xs text-fg-muted">{c.label}</dt>
                            <dd className="break-words whitespace-pre-line">
                              {row.cells[c.id]}
                            </dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                    {row.breakdown && (
                      <div className="rounded-input border border-line p-3 text-sm">
                        {row.breakdown.lines.map((l, i) => (
                          <p key={i} className="flex justify-between gap-2">
                            <span className="text-fg-muted">
                              {l.label}
                              {l.quantity > 1 && ` × ${l.quantity}`}
                            </span>
                            <span className="tabular-nums">
                              {formatPaise(l.totalMinor)}
                            </span>
                          </p>
                        ))}
                        {row.breakdown.discountMinor > 0 && (
                          <p className="flex justify-between gap-2">
                            <span className="text-fg-muted">
                              Coupon {row.breakdown.couponCode}
                            </span>
                            <span className="tabular-nums">
                              −{formatPaise(row.breakdown.discountMinor)}
                            </span>
                          </p>
                        )}
                        <p className="mt-1 flex justify-between gap-2 border-t border-line pt-1 font-medium">
                          <span>Total</span>
                          <span className="tabular-nums">
                            {formatPaise(row.breakdown.totalMinor)}
                          </span>
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                      <span>
                        {row.receipt} · {when.format(new Date(row.createdAt))}
                        {row.paymentId && ` · Razorpay ${row.paymentId}`}
                      </span>
                      {!row.paymentId && row.status !== "pending_payment" && (
                        <DeleteResponseButton
                          formId={form.id}
                          submissionId={row.id}
                        />
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {data.pages > 1 && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between gap-2 text-sm"
        >
          {data.page > 1 ? (
            <Link
              href={qs({ page: data.page - 1 })}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-fg-muted">
            Page {data.page} of {data.pages} · {data.total} total
          </span>
          {data.page < data.pages ? (
            <Link
              href={qs({ page: data.page + 1 })}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass flex flex-col gap-1 rounded-card p-5">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-2xl font-normal tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}
