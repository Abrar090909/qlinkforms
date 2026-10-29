"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteAction, duplicateAction, setStatusAction } from "./actions";

/** Per-form actions behind a "⋯" button, in a dialog so it works on touch and keyboard. */
export function FormCardMenu({
  formId,
  status,
  slug,
}: {
  formId: string;
  status: "draft" | "published" | "archived";
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const run = (fn: () => Promise<unknown>, done?: string) =>
    startTransition(async () => {
      await fn();
      if (done) toast.show(done);
      setOpen(false);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Form options"
        className="relative z-10 -mt-2 -mr-2 flex size-11 items-center justify-center rounded-full text-fg-muted hover:bg-surface-hover hover:text-fg"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          <circle cx="3" cy="8" r="1.4" fill="currentColor" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
          <circle cx="13" cy="8" r="1.4" fill="currentColor" />
        </svg>
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setConfirmDelete(false);
        }}
        title={confirmDelete ? "Delete this form?" : "Form options"}
        description={
          confirmDelete
            ? "Its responses are deleted too. Forms with payments can't be deleted; archive them instead."
            : undefined
        }
        actions={
          confirmDelete ? (
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                pending={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteAction(formId);
                    toast.show(result.ok ? "Form deleted" : result.message);
                    if (result.ok) setOpen(false);
                    setConfirmDelete(false);
                  })
                }
              >
                Delete form
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          )
        }
      >
        {!confirmDelete && (
          <div className="flex flex-col gap-2">
            {status === "published" && (
              <a
                href={`/f/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center rounded-input px-3 hover:bg-surface-hover"
              >
                Open live form ↗
              </a>
            )}
            <MenuButton
              disabled={pending}
              onClick={() => run(() => duplicateAction(formId))}
            >
              Duplicate
            </MenuButton>
            {status === "archived" ? (
              <MenuButton
                disabled={pending}
                onClick={() =>
                  run(
                    () => setStatusAction(formId, "draft"),
                    "Form restored as a draft",
                  )
                }
              >
                Restore
              </MenuButton>
            ) : (
              <MenuButton
                disabled={pending}
                onClick={() =>
                  run(
                    () => setStatusAction(formId, "archived"),
                    "Form archived. Its link no longer accepts responses.",
                  )
                }
              >
                Archive
              </MenuButton>
            )}
            <MenuButton
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
              danger
            >
              Delete…
            </MenuButton>
          </div>
        )}
      </Dialog>
    </>
  );
}

function MenuButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 items-center rounded-input px-3 text-left hover:bg-surface-hover disabled:opacity-50 ${danger ? "text-danger" : ""}`}
    >
      {children}
    </button>
  );
}
