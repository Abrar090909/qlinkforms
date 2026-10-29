import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspace } from "@/server/workspaces";

// Shell for signed-in pages. The proxy redirects signed-out visitors, and
// every session read here verifies the user again on the server.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-surface-alt px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 font-semibold no-underline"
          >
            UPI Forms
          </Link>
          <span aria-hidden="true" className="h-6 w-px bg-line" />
          <Suspense fallback={<span aria-hidden="true" />}>
            <WorkspaceName />
          </Suspense>
        </div>
        <form action={logout}>
          <Button type="submit" variant="secondary" className="px-4">
            Log out
          </Button>
        </form>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

async function WorkspaceName() {
  const user = await requireUser();
  const workspace = await getCurrentWorkspace(user);
  return (
    <span className="truncate text-sm text-fg-muted" title={workspace.name}>
      <span className="sr-only">Workspace: </span>
      {workspace.name}
    </span>
  );
}
