import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

// Landing placeholder. Sections alternate light and dark (DESIGN.md section 6).

const points = [
  {
    title: "Paid straight to you",
    body: "Connect your own Razorpay account. Money settles there directly; we never hold it.",
  },
  {
    title: "UPI first",
    body: "Respondents pay with any UPI app, card or netbanking, right where they submit.",
  },
  {
    title: "Amounts you can trust",
    body: "Prices are worked out on our server from your form, never from the browser.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-marketing items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <span className="text-lg font-semibold">UPI Forms</span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClasses()}>
            Sign up
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-marketing flex-col items-start gap-6 px-4 py-16 sm:px-8 sm:py-24">
          <p className="text-caption tracking-wider text-eyebrow uppercase">
            Forms with payments
          </p>
          <h1 className="max-w-4xl font-display text-heading-sm font-normal sm:text-heading lg:text-display">
            Collect payments with every form.
          </h1>
          <p className="max-w-xl text-body-lg text-fg-muted">
            Registrations, orders, fees and donations. Build the form, share
            the link, get paid over UPI.
          </p>
          <Link href="/signup" className={buttonClasses()}>
            Create a free account
          </Link>
        </section>

        <section className="bg-inverse text-inverse-fg">
          <div className="mx-auto flex w-full max-w-marketing flex-col gap-8 px-4 py-16 sm:px-8 sm:py-24">
            <h2 className="max-w-3xl font-display text-heading-sm font-normal">
              Built for India, from the first rupee.
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {points.map((point) => (
                <li key={point.title}>
                  <div className="flex h-full flex-col gap-2 rounded-card bg-inverse-raised p-6">
                    <h3 className="text-lg font-semibold">{point.title}</h3>
                    <p className="text-base">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-marketing px-4 py-8 text-sm text-fg-muted sm:px-8">
        UPI Forms
      </footer>
    </div>
  );
}
