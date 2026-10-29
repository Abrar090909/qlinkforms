"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  connectRazorpay,
  disconnectRazorpay,
} from "@/server/payments/accounts";
import { renameWorkspace } from "@/server/workspaces";

export async function connectRazorpayAction(input: {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}) {
  const user = await requireUser();
  const result = await connectRazorpay(user, {
    keyId: String(input?.keyId ?? ""),
    keySecret: String(input?.keySecret ?? ""),
    webhookSecret: String(input?.webhookSecret ?? ""),
  });
  if (result.ok) refresh();
  return result;
}

export async function disconnectRazorpayAction() {
  const user = await requireUser();
  const result = await disconnectRazorpay(user);
  if (result.ok) refresh();
  return result;
}

export async function renameWorkspaceAction(name: string) {
  const user = await requireUser();
  const result = await renameWorkspace(user, String(name ?? ""));
  if (result.ok) refresh();
  return result;
}
