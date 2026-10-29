import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

// Centred card for login and signup. Route handlers in this group
// (callback, confirm) don't render, so this only wraps the pages.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12 sm:justify-center">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
          className="self-center text-lg font-semibold no-underline"
        >
          UPI Forms
        </Link>
        <Card className="flex flex-col gap-6 sm:p-8">{children}</Card>
      </div>
    </main>
  );
}
