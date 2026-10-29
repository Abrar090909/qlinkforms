"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login } from "../actions";
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
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded border px-3 py-2"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded border px-4 py-2"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      <GoogleButton next={next} />
      <p>
        New here?{" "}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
