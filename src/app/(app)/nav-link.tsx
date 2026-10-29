"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/dashboard" && pathname.startsWith("/forms"));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-pill px-4 text-sm transition-colors ${active ? "bg-surface-hover text-fg" : "text-fg-muted hover:text-fg"}`}
    >
      {children}
    </Link>
  );
}
