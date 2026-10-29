import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { FormFrame } from "@/components/form/form-frame";
import { Card } from "@/components/ui/card";
import { formatPaise } from "@/lib/money";
import { getPublishedForm } from "@/server/forms";
import { getPublicStatus } from "@/server/submissions";
import { RefreshWhilePending } from "./refresh";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false },
};

export default function DonePage(props: PageProps<"/f/[slug]/done">) {
  return (
    <Suspense
      fallback={<p className="p-8 text-center text-fg-muted">Checking…</p>}
    >
      <Receipt {...props} />
    </Suspense>
  );
}

async function Receipt({ params, searchParams }: PageProps<"/f/[slug]/done">) {
  const { slug } = await params;
  const { s } = await searchParams;
  const submissionId = z.uuid().safeParse(s);
  if (!submissionId.success) notFound();
  const [form, status] = await Promise.all([
    getPublishedForm(slug),
    getPublicStatus(slug, submissionId.data),
  ]);
  if (!form || !status) notFound();
  const { settings } = form.schema;

  const state = {
    completed: {
      title: settings.thankYouTitle,
      body: settings.thankYouMessage,
    },
    paid: { title: settings.thankYouTitle, body: settings.thankYouMessage },
    pending_payment: {
      title: "Confirming your payment…",
      body: "UPI payments can take a minute. Keep this page open; it updates by itself. If money left your account, it will show here or be refunded by your bank automatically.",
    },
    payment_failed: {
      title: "Payment didn't go through",
      body: "No money was taken, or your bank will refund it automatically. You can fill in the form again to retry.",
    },
  }[status.status];

  return (
    <FormFrame theme={settings.theme} showBadge={form.plan === "free"}>
      <Card className="flex flex-col gap-6 p-6 sm:p-8" role="status">
        <div className="flex flex-col gap-3">
          {(status.status === "paid" || status.status === "completed") && (
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          )}
          <h1 className="text-3xl font-normal tracking-tight">{state.title}</h1>
          <p className="whitespace-pre-line text-fg-muted">{state.body}</p>
        </div>

        {status.breakdown && (
          <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
            {status.breakdown.lines.map((line, i) => (
              <div key={i} className="flex justify-between gap-3">
                <dt className="text-fg-muted">
                  {line.label}
                  {line.quantity > 1 && ` × ${line.quantity}`}
                </dt>
                <dd className="tabular-nums">{formatPaise(line.totalMinor)}</dd>
              </div>
            ))}
            {status.breakdown.discountMinor > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">
                  Discount ({status.breakdown.couponCode})
                </dt>
                <dd className="tabular-nums">
                  −{formatPaise(status.breakdown.discountMinor)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-line pt-3 text-base font-medium">
              <dt>{status.status === "paid" ? "Paid" : "Total"}</dt>
              <dd className="tabular-nums">
                {formatPaise(status.amountMinor)}
              </dd>
            </div>
          </dl>
        )}

        <p className="text-sm text-fg-muted">
          Receipt number{" "}
          <span className="font-medium text-fg tabular-nums">
            {status.receipt}
          </span>
        </p>
        {status.status === "payment_failed" && (
          <Link
            href={`/f/${slug}`}
            className="self-start underline underline-offset-4"
          >
            Fill in the form again
          </Link>
        )}
      </Card>
      {status.status === "pending_payment" && <RefreshWhilePending />}
    </FormFrame>
  );
}
