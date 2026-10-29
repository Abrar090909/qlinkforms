"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createForm } from "./actions";

export function NewFormButton({ label = "New form" }: { label?: string }) {
  const [state, action, pending] = useActionState(createForm, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state?.error) toast.show(state.error);
  }, [state, toast]);

  return (
    <form action={action}>
      <Button type="submit" pending={pending}>
        {pending ? "Creating…" : label}
      </Button>
    </form>
  );
}
