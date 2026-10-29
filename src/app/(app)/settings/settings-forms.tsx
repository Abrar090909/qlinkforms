"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { PaymentAccountView } from "@/server/payments/accounts";
import {
  connectRazorpayAction,
  disconnectRazorpayAction,
  renameWorkspaceAction,
} from "./actions";

export function WorkspaceNameForm({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await renameWorkspaceAction(value);
          if (r.ok) {
            setError(null);
            toast.show("Workspace renamed");
          } else setError(r.message);
        });
      }}
    >
      <div className="flex-1">
        <Input
          label="Workspace name"
          value={value}
          maxLength={60}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          error={error}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        pending={pending}
        disabled={disabled || value.trim() === name}
      >
        Save
      </Button>
    </form>
  );
}

/** Razorpay connection with the exact steps an owner follows in their dashboard. */
export function PaymentsCard({
  view,
  suggestedWebhookSecret,
}: {
  view: PaymentAccountView;
  suggestedWebhookSecret: string;
}) {
  const [editing, setEditing] = useState(!view.connected);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  // Suggested by the server so server and client HTML match.
  const [webhookSecret, setWebhookSecret] = useState(suggestedWebhookSecret);
  const [errors, setErrors] = useState<{
    field?: string;
    message: string;
  } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(`${what} copied`);
    } catch {
      toast.show("Couldn't copy; select and copy it instead");
    }
  };

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-normal tracking-tight">Payments</h2>
          <p className="text-sm text-fg-muted">
            Razorpay, with your own keys. Money settles straight into your
            account; we never hold it.
          </p>
        </div>
        {view.connected && (
          <span className="inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1 text-sm">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${view.status === "active" ? "bg-success" : "bg-danger"}`}
            />
            {view.status === "active"
              ? view.testMode
                ? "Connected · test mode"
                : "Connected · live"
              : "Keys stopped working"}
          </span>
        )}
      </div>

      {!view.secretsConfigured && (
        <Alert>
          Payments can&apos;t be connected on this server yet: its encryption
          key (PAYMENT_SECRETS_KEY) is not set. See the README.
        </Alert>
      )}
      {view.connected && view.status !== "active" && (
        <Alert>
          Razorpay rejected your saved keys (they may have been regenerated).
          Enter the new keys to start taking payments again.
        </Alert>
      )}

      {view.connected && !editing && (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-fg-muted">Key ID</dt>
              <dd className="font-medium break-all">{view.keyId}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Key secret</dt>
              <dd>Saved, encrypted. Never shown again.</dd>
            </div>
          </dl>
          <WebhookUrl url={view.webhookUrl} onCopy={copy} />
          {view.canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Replace keys
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmDisconnect(true)}
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      )}

      {editing && view.canManage && view.secretsConfigured && (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              setErrors(null);
              const r = await connectRazorpayAction({
                keyId,
                keySecret,
                webhookSecret,
              });
              if (r.ok) {
                setKeySecret("");
                setEditing(false);
                toast.show("Razorpay connected");
              } else setErrors({ field: r.field, message: r.message });
            });
          }}
        >
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-fg-muted marker:text-fg-muted">
            <li>
              Open{" "}
              <a
                href="https://dashboard.razorpay.com/app/website-app-settings/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                Razorpay → Account & Settings → API Keys
              </a>
              . Use <strong className="text-fg">Test mode</strong> first to try
              it out.
            </li>
            <li>
              Click <strong className="text-fg">Generate Key</strong> and paste
              the Key ID and Key Secret below.
            </li>
            <li>
              After saving, add the webhook URL shown here in Razorpay →
              Webhooks → <strong className="text-fg">Add New Webhook</strong>,
              with the secret below and the events{" "}
              <code className="text-fg">payment.captured</code>,{" "}
              <code className="text-fg">payment.failed</code> and{" "}
              <code className="text-fg">order.paid</code>.
            </li>
          </ol>
          <Input
            label="Key ID"
            value={keyId}
            onChange={(e) => setKeyId(e.target.value.trim())}
            placeholder="rzp_test_..."
            autoComplete="off"
            spellCheck={false}
            required
            error={errors?.field === "keyId" ? errors.message : undefined}
          />
          <Input
            label="Key Secret"
            type="password"
            value={keySecret}
            onChange={(e) => setKeySecret(e.target.value)}
            autoComplete="new-password"
            spellCheck={false}
            required
            hint="Stored encrypted. We never show it again or send it to the browser."
            error={errors?.field === "keySecret" ? errors.message : undefined}
          />
          <div className="flex flex-col gap-2">
            <Input
              label="Webhook secret"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              spellCheck={false}
              required
              hint="We made one for you. Copy it now: you'll paste it into the Razorpay webhook form."
              error={
                errors?.field === "webhookSecret" ? errors.message : undefined
              }
            />
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => copy(webhookSecret, "Webhook secret")}
            >
              Copy webhook secret
            </Button>
          </div>
          {errors && !errors.field && <Alert>{errors.message}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" pending={pending}>
              Check & save keys
            </Button>
            {view.connected && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
      {editing && !view.canManage && (
        <p className="text-sm text-fg-muted">
          Ask the workspace owner to connect Razorpay.
        </p>
      )}

      <Dialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Disconnect Razorpay?"
        description="Forms with a payment stop accepting responses until you connect again. Past payments stay in your responses."
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDisconnect(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              pending={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await disconnectRazorpayAction();
                  toast.show(r.ok ? "Razorpay disconnected" : r.message);
                  setConfirmDisconnect(false);
                  if (r.ok) setEditing(true);
                })
              }
            >
              Disconnect
            </Button>
          </>
        }
      />
    </Card>
  );
}

function WebhookUrl({
  url,
  onCopy,
}: {
  url: string;
  onCopy: (t: string, what: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-input border border-line p-3">
      <p className="text-sm font-medium">Webhook URL</p>
      <p className="text-sm break-all text-fg-muted">{url}</p>
      <p className="text-xs text-fg-muted">
        In Razorpay → Webhooks, add this URL with your webhook secret and the
        events payment.captured, payment.failed and order.paid. It keeps
        payments correct even if a respondent closes the page mid-payment.
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => onCopy(url, "Webhook URL")}
      >
        Copy URL
      </Button>
    </div>
  );
}
