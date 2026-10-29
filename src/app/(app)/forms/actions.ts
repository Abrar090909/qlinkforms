"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createDraftForm } from "@/server/forms";

export type NewFormState = { error?: string } | undefined;

/** Create a draft form and open it in the editor. */
export async function createForm(): Promise<NewFormState> {
  // Server actions are public endpoints: verify the user every time.
  const user = await requireUser();
  let formId: string;
  try {
    formId = (await createDraftForm(user)).id;
  } catch (error) {
    console.error("createForm failed", error);
    return { error: "Couldn't create the form. Try again." };
  }
  redirect(`/forms/${formId}/edit`);
}
