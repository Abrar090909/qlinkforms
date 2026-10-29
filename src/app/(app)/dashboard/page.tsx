import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder until group E adds the forms list and empty state.
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={null}>
        <SignedInAs />
      </Suspense>
    </div>
  );
}

async function SignedInAs() {
  const user = await requireUser();
  return <p>Signed in as {user.email}</p>;
}
