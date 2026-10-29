"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { TEMPLATES } from "@/lib/forms/templates";
import { createCoupon, deleteCoupon } from "@/server/coupons";
import {
  createDraftForm,
  deleteForm,
  duplicateForm,
  publishForm,
  type PublishResult,
  type SaveResult,
  saveDraft,
  setFormStatus,
  updateSlug,
} from "@/server/forms";

// Owner actions. Server actions are public endpoints: every one verifies the
// user, and the services check workspace membership for the form.

export type NewFormState = { error?: string } | undefined;

const templateIds = TEMPLATES.map((t) => t.id) as [string, ...string[]];
const formId = z.uuid();

/** Create a draft form (blank or from a template) and open it in the editor. */
export async function createForm(
  _state: NewFormState,
  formData: FormData,
): Promise<NewFormState> {
  const user = await requireUser();
  const template = z
    .enum(templateIds)
    .optional()
    .safeParse(formData.get("templateId") || undefined);
  let id: string;
  try {
    id = (
      await createDraftForm(user, {
        templateId: template.success ? template.data : undefined,
      })
    ).id;
  } catch (error) {
    console.error(
      "createForm failed",
      error instanceof Error ? error.message : error,
    );
    return { error: "Couldn't create the form. Try again." };
  }
  redirect(`/forms/${id}/edit`);
}

export async function saveDraftAction(
  id: string,
  draft: unknown,
  baseUpdatedAt: string,
): Promise<SaveResult> {
  const user = await requireUser();
  if (!formId.safeParse(id).success)
    return { ok: false, reason: "not_found", message: "Form not found" };
  return saveDraft(user, id, draft, String(baseUpdatedAt));
}

export async function publishAction(id: string): Promise<PublishResult> {
  const user = await requireUser();
  if (!formId.safeParse(id).success)
    return { ok: false, message: "Form not found" };
  return publishForm(user, id);
}

export async function updateSlugAction(id: string, slug: string) {
  const user = await requireUser();
  if (!formId.safeParse(id).success)
    return { ok: false as const, message: "Form not found" };
  return updateSlug(user, id, String(slug).slice(0, 60));
}

export async function setStatusAction(
  id: string,
  status: "archived" | "draft",
) {
  const user = await requireUser();
  if (!formId.safeParse(id).success || !["archived", "draft"].includes(status))
    return false;
  const ok = await setFormStatus(user, id, status);
  refresh();
  return ok;
}

export async function duplicateAction(id: string) {
  const user = await requireUser();
  if (!formId.safeParse(id).success) return;
  const copy = await duplicateForm(user, id);
  if (copy) redirect(`/forms/${copy.id}/edit`);
}

export async function deleteAction(id: string) {
  const user = await requireUser();
  if (!formId.safeParse(id).success)
    return { ok: false as const, message: "Form not found" };
  const result = await deleteForm(user, id);
  if (result.ok) refresh();
  return result;
}

export async function createCouponAction(id: string, input: unknown) {
  const user = await requireUser();
  if (!formId.safeParse(id).success)
    return { ok: false as const, message: "Form not found" };
  const result = await createCoupon(user, id, input);
  if (result.ok) refresh();
  return result;
}

export async function deleteCouponAction(id: string, couponId: string) {
  const user = await requireUser();
  if (!formId.safeParse(id).success || !z.uuid().safeParse(couponId).success)
    return false;
  const ok = await deleteCoupon(user, id, couponId);
  refresh();
  return ok;
}
