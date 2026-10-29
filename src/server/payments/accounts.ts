import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  decryptSecret,
  encryptSecret,
  secretsConfigured,
} from "@/server/secrets";
import { getCurrentWorkspace } from "@/server/workspaces";
import {
  RazorpayError,
  type RazorpayCredentials,
  verifyCredentials,
} from "./razorpay";

export const connectRazorpaySchema = z.object({
  keyId: z
    .string()
    .trim()
    .regex(
      /^rzp_(test|live)_[A-Za-z0-9]{8,32}$/,
      "Key ID starts with rzp_test_ or rzp_live_",
    ),
  keySecret: z.string().trim().min(8, "Paste the Key Secret").max(100),
  webhookSecret: z.string().trim().min(8, "Use at least 8 characters").max(100),
});

/** What the settings page may show. Never includes a secret. */
export type PaymentAccountView = {
  connected: boolean;
  keyId: string | null;
  testMode: boolean;
  status: "active" | "invalid" | "disabled" | null;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  canManage: boolean;
  secretsConfigured: boolean;
};

async function roleIn(user: SessionUser, workspaceId: string) {
  const m = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: { role: true },
  });
  return m?.role ?? null;
}

export function webhookUrlFor(siteUrl: string, accountId: string | null) {
  return accountId
    ? `${siteUrl}/api/webhooks/razorpay/${accountId}`
    : `${siteUrl}/api/webhooks/razorpay/<saved after you connect>`;
}

export async function getPaymentAccountView(
  user: SessionUser,
  siteUrl: string,
): Promise<PaymentAccountView> {
  const workspace = await getCurrentWorkspace(user);
  const [account, role] = await Promise.all([
    db.paymentAccount.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: "razorpay",
        },
      },
      select: {
        id: true,
        keyId: true,
        status: true,
        webhookSecretEncrypted: true,
      },
    }),
    roleIn(user, workspace.id),
  ]);
  return {
    connected: Boolean(account),
    keyId: account?.keyId ?? null,
    testMode: account?.keyId.startsWith("rzp_test_") ?? false,
    status: account?.status ?? null,
    hasWebhookSecret: Boolean(account?.webhookSecretEncrypted),
    webhookUrl: webhookUrlFor(siteUrl, account?.id ?? null),
    canManage: role === "owner" || role === "admin",
    secretsConfigured: secretsConfigured(),
  };
}

export type ConnectResult =
  { ok: true } | { ok: false; message: string; field?: string };

export async function connectRazorpay(
  user: SessionUser,
  input: unknown,
): Promise<ConnectResult> {
  const parsed = connectRazorpaySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue?.message ?? "Check the keys",
      field: String(issue?.path[0] ?? ""),
    };
  }
  if (!secretsConfigured()) {
    return {
      ok: false,
      message:
        "Payments aren't set up on this server yet (PAYMENT_SECRETS_KEY is missing).",
    };
  }
  const workspace = await getCurrentWorkspace(user);
  const role = await roleIn(user, workspace.id);
  if (role !== "owner" && role !== "admin") {
    return {
      ok: false,
      message: "Only the workspace owner or an admin can connect payments.",
    };
  }
  const { keyId, keySecret, webhookSecret } = parsed.data;
  try {
    await verifyCredentials({ keyId, keySecret });
  } catch (error) {
    if (
      error instanceof RazorpayError &&
      (error.status === 401 || error.status === 400)
    ) {
      return {
        ok: false,
        message:
          "Razorpay rejected these keys. Copy them again from Razorpay > Account & Settings > API Keys.",
      };
    }
    return {
      ok: false,
      message:
        "Couldn't reach Razorpay to check the keys. Try again in a minute.",
    };
  }
  await db.$transaction(async (tx) => {
    const data = {
      keyId,
      secretEncrypted: encryptSecret(keySecret),
      webhookSecretEncrypted: encryptSecret(webhookSecret),
      status: "active" as const,
    };
    await tx.paymentAccount.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: "razorpay",
        },
      },
      create: { workspaceId: workspace.id, provider: "razorpay", ...data },
      update: data,
    });
    // Log the key id only, never secrets.
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        action: "payments.connected",
        metaJson: { provider: "razorpay", keyId },
      },
    });
  });
  return { ok: true };
}

export async function disconnectRazorpay(
  user: SessionUser,
): Promise<ConnectResult> {
  const workspace = await getCurrentWorkspace(user);
  const role = await roleIn(user, workspace.id);
  if (role !== "owner" && role !== "admin") {
    return {
      ok: false,
      message: "Only the workspace owner or an admin can disconnect payments.",
    };
  }
  await db.$transaction(async (tx) => {
    await tx.paymentAccount.deleteMany({
      where: { workspaceId: workspace.id, provider: "razorpay" },
    });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        action: "payments.disconnected",
        metaJson: { provider: "razorpay" },
      },
    });
  });
  return { ok: true };
}

export type ActiveAccount = {
  id: string;
  workspaceId: string;
  creds: RazorpayCredentials;
  webhookSecret: string | null;
};

function toActive(account: {
  id: string;
  workspaceId: string;
  keyId: string;
  secretEncrypted: string;
  webhookSecretEncrypted: string | null;
}): ActiveAccount {
  return {
    id: account.id,
    workspaceId: account.workspaceId,
    creds: {
      keyId: account.keyId,
      keySecret: decryptSecret(account.secretEncrypted),
    },
    webhookSecret: account.webhookSecretEncrypted
      ? decryptSecret(account.webhookSecretEncrypted)
      : null,
  };
}

const accountSelect = {
  id: true,
  workspaceId: true,
  keyId: true,
  secretEncrypted: true,
  webhookSecretEncrypted: true,
} as const;

/** Decrypted credentials for server-side payment calls. Never send to a client. */
export async function getActiveAccount(
  workspaceId: string,
): Promise<ActiveAccount | null> {
  const account = await db.paymentAccount.findFirst({
    where: { workspaceId, provider: "razorpay", status: "active" },
    select: accountSelect,
  });
  return account ? toActive(account) : null;
}

export async function getAccountById(
  accountId: string,
): Promise<ActiveAccount | null> {
  const account = await db.paymentAccount.findUnique({
    where: { id: accountId },
    select: accountSelect,
  });
  return account ? toActive(account) : null;
}

/** Called when Razorpay says the keys stopped working (revoked or rotated). */
export async function markAccountInvalid(accountId: string) {
  await db.paymentAccount.update({
    where: { id: accountId },
    data: { status: "invalid" },
  });
}
