import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-eyebrow font-medium text-fg-muted">404</p>
      <h1 className="text-3xl font-normal tracking-tight">
        This page doesn&apos;t exist
      </h1>
      <p className="max-w-md text-fg-muted">
        The link may be wrong, or the form was closed or removed by its owner.
      </p>
      <Link
        href="/"
        className={buttonClasses({ variant: "secondary", pill: true })}
      >
        Go to the home page
      </Link>
    </main>
  );
}
