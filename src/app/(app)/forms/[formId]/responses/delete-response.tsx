"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteResponseAction } from "./actions";

export function DeleteResponseButton({
  formId,
  submissionId,
}: {
  formId: string;
  submissionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-input px-2 text-danger hover:bg-surface-hover"
      >
        Delete
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this response?"
        description="This can't be undone."
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              pending={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteResponseAction(
                    formId,
                    submissionId,
                  );
                  toast.show(result.ok ? "Response deleted" : result.message);
                  setOpen(false);
                })
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
