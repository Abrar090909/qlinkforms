"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Footer actions, for example Cancel and Confirm buttons. */
  actions?: ReactNode;
};

/**
 * Modal dialog on the native <dialog> element: the browser traps focus,
 * closes on Escape, makes the page behind it inert and returns focus to the
 * opener when it closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape and form[method=dialog] fire "close"; keep `open` in sync.
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> element itself.
      // The backdrop is --palette-ink at 60%, written out because older
      // browsers don't pass custom properties to ::backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border border-line bg-surface p-0 text-fg backdrop:bg-[rgb(42_34_43/0.6)]"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <div id={descriptionId} className="text-base text-fg-muted">
            {description}
          </div>
        )}
        {children}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {actions ?? (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
