import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getFormForUser } from "@/server/forms";

export const metadata: Metadata = { title: "Edit form" };

// Placeholder editor. The builder arrives in a later week.
export default function EditFormPage({
  params,
}: PageProps<"/forms/[formId]/edit">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/dashboard" className="self-start text-sm underline">
        ← All forms
      </Link>
      <Suspense fallback={<p className="text-fg-muted">Loading form…</p>}>
        <Editor params={params} />
      </Suspense>
    </div>
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

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wider text-eyebrow uppercase">
          {form.status}
        </p>
        <h1 className="text-2xl font-semibold break-words">{form.title}</h1>
      </div>
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Editor coming soon</h2>
        <p className="text-fg-muted">
          Your draft is saved. The form builder (fields, theme and publishing)
          lands here in a later release.
        </p>
      </Card>
    </>
  );
}
