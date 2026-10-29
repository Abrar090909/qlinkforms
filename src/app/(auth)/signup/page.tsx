import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <SignupForm />
    </>
  );
}
