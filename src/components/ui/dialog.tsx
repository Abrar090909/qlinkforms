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
  size?: "md" | "lg";
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
  size = "md",
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
      // The backdrop colour is written out because older browsers don't pass
      // custom properties to ::backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] ${size === "lg" ? "max-w-2xl" : "max-w-md"} rounded-panel border border-line bg-surface-solid p-0 text-fg backdrop:bg-[rgb(0_0_0/0.65)]`}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-xl font-medium tracking-tight">
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
