"use client";

import QRCode from "qrcode";
import { useEffect, useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cx } from "@/components/ui/cx";
import { controlClasses, FieldError } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { publishAction, updateSlugAction } from "../../actions";

type Props = {
  open: boolean;
  onClose: () => void;
  formId: string;
  slug: string;
  siteUrl: string;
  status: "draft" | "published" | "archived";
  canPublish: boolean;
  unpublishedChanges: boolean;
  onPublished: (at: string) => void;
  onSlug: (slug: string) => void;
  flushSave: () => Promise<void>;
};

/** Publish, then share: link, QR code and WhatsApp (technical plan section 8). */
export function PublishDialog(props: Props) {
  const { open, onClose, formId, slug, siteUrl, status } = props;
  const url = `${siteUrl}/f/${slug}`;
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const live = status === "published";

  useEffect(() => {
    if (!open || !live) return;
    // Dark modules on white, so every phone camera can read it.
    QRCode.toDataURL(url, {
      margin: 1,
      width: 480,
      color: { dark: "#1b1b1b", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, live, url]);

  function publish() {
    startTransition(async () => {
      setError(null);
      await props.flushSave();
      const result = await publishAction(formId);
      if (result.ok) {
        props.onPublished(new Date().toISOString());
        toast.show(live ? "Changes are live" : "Your form is live");
      } else setError(result.message);
    });
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Fill in this form: ${url}`)}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={live ? "Share your form" : "Publish your form"}
      size="lg"
      actions={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {!live && (
          <p className="text-fg-muted">
            Publishing makes the form public at its link. You can keep editing;
            changes go live when you publish again.
          </p>
        )}
        {live && props.unpublishedChanges && (
          <Alert tone="info">
            You have changes that aren&apos;t live yet. Publish them so
            respondents see the latest version.
          </Alert>
        )}
        {error && <Alert>{error}</Alert>}
        {(!live || props.unpublishedChanges) && (
          <Button
            onClick={publish}
            pending={pending}
            disabled={!props.canPublish}
            size="lg"
          >
            {live ? "Publish changes" : "Publish now"}
          </Button>
        )}
        {!props.canPublish && (
          <p className="text-sm text-fg-muted">
            Fix any highlighted fields and wait for “All changes saved” before
            publishing.
          </p>
        )}

        <SlugEditor
          formId={formId}
          slug={slug}
          siteUrl={siteUrl}
          onSlug={props.onSlug}
        />

        {live && (
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.show("Link copied");
                  } catch {
                    toast.show("Couldn't copy. Select the link and copy it.");
                  }
                }}
              >
                Copy link
              </Button>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-button border border-line px-5 hover:bg-surface-hover"
              >
                Share on WhatsApp
              </a>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-button px-5 text-accent hover:underline"
              >
                Open form ↗
              </a>
            </div>
            {qr && (
              <figure className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise */}
                <img
                  src={qr}
                  alt={`QR code for ${url}`}
                  width={160}
                  height={160}
                  className="bg-white size-40 rounded-[12px] p-1"
                />
                <a
                  href={qr}
                  download={`${slug}-qr.png`}
                  className="text-sm text-accent underline-offset-4 hover:underline"
                >
                  Download QR
                </a>
              </figure>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

function SlugEditor({
  formId,
  slug,
  siteUrl,
  onSlug,
}: {
  formId: string;
  slug: string;
  siteUrl: string;
  onSlug: (s: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(slug);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const host = siteUrl.replace(/^https?:\/\//, "");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Form link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div
          className={cx(
            controlClasses,
            "flex min-h-12 items-center gap-0 px-0",
          )}
        >
          <span className="shrink-0 pl-4 text-sm text-fg-muted">{host}/f/</span>
          <input
            id={id}
            value={value}
            onChange={(e) =>
              setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
            }
            className="min-w-0 flex-1 bg-transparent py-3 pr-4 focus-visible:outline-none"
            aria-describedby={error ? `${id}-err` : undefined}
          />
        </div>
        <Button
          variant="secondary"
          pending={pending}
          disabled={value === slug}
          onClick={() =>
            startTransition(async () => {
              const result = await updateSlugAction(formId, value);
              if (result.ok) {
                setError(null);
                onSlug(result.slug);
                toast.show("Link updated. The old link stops working.");
              } else setError(result.message);
            })
          }
        >
          Save link
        </Button>
      </div>
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}
