import type { ReactNode } from "react";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspace } from "@/server/workspaces";

// Shell for signed-in pages. The proxy redirects signed-out visitors, and
// every session read here verifies the user again on the server.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <Suspense fallback={<span aria-hidden="true" />}>
          <WorkspaceName />
        </Suspense>
        <form action={logout}>
          <button type="submit" className="rounded border px-3 py-1.5">
            Log out
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}

async function WorkspaceName() {
  const user = await requireUser();
  const workspace = await getCurrentWorkspace(user);
  return <span className="truncate font-semibold">{workspace.name}</span>;
}
