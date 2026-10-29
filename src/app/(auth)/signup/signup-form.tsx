"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signup } from "../actions";
import { AuthDivider } from "../auth-divider";
import { GoogleButton } from "../google-button";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  if (state?.message) {
    return (
      <p role="status" className="text-base">
        {state.message}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton />
      <AuthDivider />
      <form action={action} className="flex flex-col gap-4">
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          required
          maxLength={80}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
        />
        {state?.error && <Alert>{state.error}</Alert>}
        <Button type="submit" pending={pending} fullWidth>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
