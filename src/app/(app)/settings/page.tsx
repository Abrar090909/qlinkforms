import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { emailConfigured } from "@/server/email";
import { getPaymentAccountView } from "@/server/payments/accounts";
import { getCurrentWorkspace } from "@/server/workspaces";
import { PaymentsCard, WorkspaceNameForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow text-fg-muted uppercase">Workspace</p>
        <h1 className="text-3xl font-normal tracking-tight">Settings</h1>
      </div>
      <Suspense fallback={<p className="text-fg-muted">Loading…</p>}>
        <Sections />
      </Suspense>
    </div>
  );
}

async function Sections() {
  const user = await requireUser();
  const [workspace, payments] = await Promise.all([
    getCurrentWorkspace(user),
    getPaymentAccountView(user, serverEnv.SITE_URL),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6">
        <PaymentsCard
          view={payments}
          suggestedWebhookSecret={randomBytes(18).toString("hex")}
        />
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-normal tracking-tight">Workspace</h2>
          <WorkspaceNameForm
            name={workspace.name}
            disabled={!payments.canManage}
          />
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Emails</h2>
          <p className="text-sm text-fg-muted">
            {emailConfigured()
              ? "Receipts go to respondents who give an email, and you get an email for every new response."
              : "Receipt and notification emails are switched off on this server until an email provider (Resend) is connected."}
          </p>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Your account</h2>
          <p className="text-sm break-all text-fg-muted">{user.email}</p>
        </Card>
      </div>
    </div>
  );
}
