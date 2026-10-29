import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Log in</h1>
      {/* The form reads ?next= and ?error=, which are request-time values. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
