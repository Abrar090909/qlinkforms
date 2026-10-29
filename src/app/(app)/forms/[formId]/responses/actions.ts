"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { deleteResponse } from "@/server/responses";

export async function deleteResponseAction(
  formId: string,
  submissionId: string,
) {
  const user = await requireUser();
  if (
    !z.uuid().safeParse(formId).success ||
    !z.uuid().safeParse(submissionId).success
  ) {
    return { ok: false as const, message: "Response not found" };
  }
  const result = await deleteResponse(user, formId, submissionId);
  if (result.ok) refresh();
  return result;
}
