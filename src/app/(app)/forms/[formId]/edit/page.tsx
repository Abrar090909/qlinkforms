import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { listCoupons } from "@/server/coupons";
import { draftOf, getFormForUser } from "@/server/forms";
import { getPaymentAccountView } from "@/server/payments/accounts";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Edit form" };

export default function EditFormPage({
  params,
}: PageProps<"/forms/[formId]/edit">) {
  return (
    <Suspense fallback={<p className="text-fg-muted">Loading editor…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/forms/[formId]/edit">["params"];
}) {
  const { formId } = await params;
  // Not a uuid: treat like any other missing form instead of a database error.
  if (!z.uuid().safeParse(formId).success) notFound();
  const user = await requireUser();
  const form = await getFormForUser(user, formId);
  if (!form) notFound();
  const [coupons, payments] = await Promise.all([
    listCoupons(user, formId),
    getPaymentAccountView(user, serverEnv.SITE_URL),
  ]);

  return (
    <Builder
      formId={form.id}
      initialDraft={draftOf(form)}
      initialUpdatedAt={form.updatedAt.toISOString()}
      initialSlug={form.slug}
      status={form.status}
      publishedAt={form.publishedAt?.toISOString() ?? null}
      siteUrl={serverEnv.SITE_URL}
      paymentsConnected={payments.connected && payments.status === "active"}
      coupons={(coupons ?? []).map((c) => ({
        ...c,
        expiresAt: c.expiresAt?.toISOString() ?? null,
      }))}
    />
  );
}
