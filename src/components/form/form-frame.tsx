import Link from "next/link";
import type { ReactNode } from "react";
import { themeStyle } from "@/lib/color";
import type { FormSettings } from "@/lib/forms/schema";

/** Public form page chrome: theme, centred column, free-plan badge. */
export function FormFrame({
  theme,
  showBadge,
  children,
}: {
  theme: FormSettings["theme"];
  showBadge: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-theme={theme.preset}
      style={themeStyle(theme.preset, theme.accent)}
      className="relative flex min-h-full flex-1 flex-col bg-canvas text-fg"
    >
      <main className="relative mx-auto flex w-full max-w-form flex-1 flex-col px-4 py-10 sm:py-16">
        {children}
      </main>
      {showBadge && (
        <footer className="relative pb-8 text-center text-sm text-fg-muted">
          <Link href="/" className="underline-offset-4 hover:underline">
            Made with UPI Forms
          </Link>
        </footer>
      )}
    </div>
  );
}
