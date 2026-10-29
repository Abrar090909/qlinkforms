import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormFrame } from "@/components/form/form-frame";
import { Card } from "@/components/ui/card";
import { getPublishedForm } from "@/server/forms";
import { PublicForm } from "./public-form";

export async function generateMetadata({
  params,
}: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublishedForm(slug);
  if (!form) return { title: "Form not found" };
  return {
    title: form.schema.title,
    description: form.schema.description.slice(0, 160) || undefined,
    // Owners share links; search engines shouldn't index respondents' forms.
    robots: { index: false, follow: false },
  };
}

export default function PublicFormPage({ params }: PageProps<"/f/[slug]">) {
  return (
    <Suspense
      fallback={<p className="p-8 text-center text-fg-muted">Loading form…</p>}
    >
      <Form params={params} />
    </Suspense>
  );
}

async function Form({ params }: { params: PageProps<"/f/[slug]">["params"] }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) notFound();
  const form = await getPublishedForm(slug);
  if (!form) notFound();
  const { schema } = form;

  return (
    <FormFrame theme={schema.settings.theme} showBadge={form.plan === "free"}>
      {schema.settings.closed ? (
        <Card className="flex flex-col gap-3 text-center">
          <h1 className="text-2xl font-normal">{schema.title}</h1>
          <p className="text-fg-muted">{schema.settings.closedMessage}</p>
        </Card>
      ) : (
        <PublicForm
          slug={form.slug}
          versionId={form.versionId}
          schema={schema}
        />
      )}
    </FormFrame>
  );
}
