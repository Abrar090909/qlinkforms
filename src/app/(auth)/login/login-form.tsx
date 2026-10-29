"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "../actions";
import { AuthDivider } from "../auth-divider";
import { GoogleButton } from "../google-button";

const linkErrors: Record<string, string> = {
  oauth: "Google sign-in didn't finish. Try again.",
  link: "That link is invalid or has expired. Log in, or sign up again for a new link.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const linkError = linkErrors[searchParams.get("error") ?? ""];
  const [state, action, pending] = useActionState(login, undefined);
  const error = state?.error ?? linkError;

  return (
    <div className="flex flex-col gap-6">
      <GoogleButton next={next} />
      <AuthDivider />
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
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
          autoComplete="current-password"
          required
        />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" pending={pending} fullWidth>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-sm">
        New here?{" "}
        <Link href="/signup" className="font-medium underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
