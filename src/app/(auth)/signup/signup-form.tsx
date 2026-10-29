"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { GoogleButton } from "../google-button";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  if (state?.message) {
    return <p role="status">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Name
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            className="rounded border px-3 py-2"
          />
        </label>
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
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            className="rounded border px-3 py-2"
          />
          <span id="password-hint" className="text-sm">
            At least 8 characters.
          </span>
        </label>
        {state?.error && <p role="alert">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded border px-4 py-2"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <GoogleButton />
      <p>
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
