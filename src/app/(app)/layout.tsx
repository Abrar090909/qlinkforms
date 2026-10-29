import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspace } from "@/server/workspaces";
import { NavLink } from "./nav-link";

// Shell for signed-in pages. The proxy redirects signed-out visitors, and
// every session read here verifies the user again on the server.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="tile sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex w-full max-w-app items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 font-medium"
              aria-label="UPI Forms home"
            >
              <Logo />
              <span className="hidden sm:inline">UPI Forms</span>
            </Link>
            <span aria-hidden="true" className="h-5 w-px bg-line" />
            <Suspense fallback={<span aria-hidden="true" />}>
              <WorkspaceName />
            </Suspense>
          </div>
          <nav aria-label="Main" className="flex items-center gap-1">
            {/* The active highlight reads the URL, which streams in after prerender. */}
            <Suspense fallback={<NavLinks />}>
              <NavLink href="/dashboard">Forms</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </Suspense>
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="md"
                className="px-3 text-sm text-fg-muted"
              >
                Log out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}

function NavLinks() {
  const cls =
    "inline-flex min-h-11 items-center rounded-pill px-4 text-sm text-fg-muted hover:text-fg";
  return (
    <>
      <Link href="/dashboard" className={cls}>
        Forms
      </Link>
      <Link href="/settings" className={cls}>
        Settings
      </Link>
    </>
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
