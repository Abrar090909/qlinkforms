import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

// Landing page, DESIGN.md v3 ("Ledger"): paper canvas, white hairline tiles,
// ink actions, green only for money. The visuals are the product itself, built
// in markup. No client JavaScript on this page.

const nav = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const steps = [
  {
    n: "1",
    title: "Build the form",
    body: "Type your questions like a document. Press / to add choices, dates, ratings or a payment block. Or start from a template.",
  },
  {
    n: "2",
    title: "Connect Razorpay",
    body: "Paste your own API keys once. Payments settle into your account on Razorpay's usual schedule.",
  },
  {
    n: "3",
    title: "Share the link",
    body: "Send it on WhatsApp, print the QR code, add it to your bio. People pay with any UPI app.",
  },
];

const templates = [
  "Coaching admission",
  "Event tickets",
  "College fest",
  "Workshop booking",
  "Order form",
  "Donation",
  "Consultation",
  "Membership",
  "RSVP",
  "Feedback",
];

const faqs = [
  {
    q: "Do you hold my money?",
    a: "No. Payments go from the respondent to your own Razorpay account and settle to your bank. We only create the order and record that it was paid.",
  },
  {
    q: "What does it cost?",
    a: "Nothing while we are in beta. Razorpay charges its standard fee per payment, directly to you. We add no commission.",
  },
  {
    q: "Do I need a Razorpay account?",
    a: "Only for forms that take payments. Free forms like RSVPs and feedback work without one. You can start in Razorpay's test mode.",
  },
  {
    q: "Which payment methods work?",
    a: "Everything your Razorpay account supports: UPI apps like GPay, PhonePe and Paytm, plus cards and netbanking.",
  },
  {
    q: "Can someone change the price?",
    a: "No. Amounts are calculated on our server from the form you published, so editing the page in a browser changes nothing.",
  },
  {
    q: "Can I export responses?",
    a: "Yes, to CSV for Excel or Google Sheets, with payment status, amounts, coupons and Razorpay payment IDs.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-50 border-b border-line bg-canvas">
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 w-full max-w-marketing items-center justify-between gap-4 px-4 sm:px-6"
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-medium"
          >
            <Logo className="size-6" />
            UPI Forms
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-button px-3 py-2 text-sm text-fg-muted hover:text-fg"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: "min-h-10 px-3",
              })}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={buttonClasses({
                size: "sm",
                className: "min-h-10 px-4",
              })}
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-marketing items-center gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pb-24">
          <div className="flex flex-col items-start gap-6">
            <p className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1 text-sm text-fg-muted">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-brand"
              />
              UPI, cards and netbanking on any form
            </p>
            <h1 className="text-display font-medium">
              Forms that collect payments.
            </h1>
            <p className="max-w-lg text-lg text-fg-muted">
              Build a registration, order or donation form in minutes. People
              pay with any UPI app, and the money settles in your own Razorpay
              account.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/signup"
                className={buttonClasses({
                  size: "lg",
                  className: "px-6 text-base",
                })}
              >
                Start free
              </Link>
              <a
                href="#product"
                className={buttonClasses({
                  variant: "secondary",
                  size: "lg",
                  className: "px-6 text-base",
                })}
              >
                See how it looks
              </a>
            </div>
            <p className="text-sm text-fg-subtle">
              Free during beta · No commission · Your money goes straight to you
            </p>
          </div>
          <HeroProduct />
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-marketing px-4 py-20 sm:px-6">
            <SectionHead label="How it works" title="Live in three minutes." />
            <ol className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="flex flex-col gap-3 bg-surface p-6">
                  <span className="flex size-7 items-center justify-center rounded-full border border-line font-mono text-sm">
                    {s.n}
                  </span>
                  <h3 className="text-lg font-medium">{s.title}</h3>
                  <p className="text-fg-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Product mosaic */}
        <section id="product" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-marketing px-4 py-20 sm:px-6">
            <SectionHead
              label="Product"
              title="Everything a form needs to take money well."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <Feature
                title="Prices that fit how you sell"
                body="A fixed fee, items with quantities, ticket tiers or pay-what-you-want. Add coupon codes with limits and expiry."
              >
                <PricingModes />
              </Feature>
              <Feature
                title="See who paid"
                body="Every response with its payment status, amount and Razorpay ID. Search, filter, export to CSV."
              >
                <ResponsesMini />
              </Feature>
              <Feature
                title="Questions that adapt"
                body="Show a question only when an earlier answer matches, so each person sees a short form."
              >
                <RuleMini />
              </Feature>
              <Feature
                title="Receipts without the follow-up"
                body="Payers get a receipt number on screen and by email. You get an email for every new response."
              >
                <ReceiptMini />
              </Feature>
            </div>
          </div>
        </section>

        {/* Money flow */}
        <section className="border-t border-line">
          <div className="mx-auto grid w-full max-w-marketing gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div className="flex flex-col gap-4">
              <SectionHead label="Your money" title="We never hold a rupee." />
              <p className="max-w-md text-fg-muted">
                You connect your own Razorpay account. Payments, refunds and
                settlements stay there. Your keys are encrypted, and the secret
                is never shown again or sent to a browser.
              </p>
            </div>
            <MoneyFlow />
          </div>
        </section>

        {/* Templates */}
        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-marketing px-4 py-20 sm:px-6">
            <SectionHead
              label="Templates"
              title="Start from a form that already works."
            />
            <ul className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {templates.map((t) => (
                <li key={t}>
                  <Link
                    href="/signup"
                    className="tile flex min-h-14 items-center justify-between gap-2 rounded-card px-4 text-sm font-medium hover:border-line-strong"
                  >
                    {t}
                    <span aria-hidden="true" className="text-fg-subtle">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto w-full max-w-marketing px-4 py-20 sm:px-6">
            <SectionHead label="Pricing" title="Free while we're in beta." />
            <div className="tile mt-10 grid gap-8 rounded-panel p-6 sm:p-8 md:grid-cols-[1fr_1fr] md:items-center">
              <div className="flex flex-col gap-3">
                <p className="flex items-baseline gap-2">
                  <span className="font-mono text-[48px] leading-none font-medium tracking-tight">
                    ₹0
                  </span>
                  <span className="text-fg-muted">per month</span>
                </p>
                <p className="max-w-sm text-fg-muted">
                  Unlimited forms and responses. Razorpay&apos;s standard
                  payment fee applies, paid to Razorpay.
                </p>
                <Link
                  href="/signup"
                  className={buttonClasses({ className: "mt-2 self-start" })}
                >
                  Create your account
                </Link>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "Unlimited forms",
                  "UPI, cards, netbanking",
                  "Items, tiers, coupons",
                  "Conditional questions",
                  "CSV export",
                  "Email receipts",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid w-full max-w-marketing gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
            <SectionHead label="FAQ" title="Questions people ask." />
            <div className="tile divide-y divide-line rounded-card">
              {faqs.map((f) => (
                <details key={f.q} className="group px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden="true"
                      className="text-xl text-fg-subtle transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-fg-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto flex w-full max-w-marketing flex-col items-start gap-6 rounded-panel bg-fg px-6 py-12 text-canvas sm:px-12 sm:py-16 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-xl text-heading font-medium">
              Stop chasing payment screenshots.
            </h2>
            <Link
              href="/signup"
              className="inline-flex min-h-12 shrink-0 items-center rounded-button bg-canvas px-6 font-medium text-fg hover:opacity-90"
            >
              Start free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-marketing flex-col gap-4 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2">
            <Logo className="size-5" />
            UPI Forms · Made in India
          </span>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/login" className="hover:text-fg">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-fg">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-eyebrow font-medium text-brand">{label}</p>
      <h2 className="max-w-2xl text-heading font-medium">{title}</h2>
    </div>
  );
}

function Feature({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <article className="tile flex flex-col overflow-hidden rounded-panel">
      <div className="flex flex-col gap-2 p-6 pb-0">
        <h3 className="text-xl font-medium">{title}</h3>
        <p className="text-fg-muted">{body}</p>
      </div>
      <div
        aria-hidden="true"
        className="mt-6 flex flex-1 items-end bg-canvas/60 px-6 pt-6"
      >
        <div className="w-full">{children}</div>
      </div>
    </article>
  );
}

function Check() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  );
}

function StatusDot({
  tone,
  children,
}: {
  tone: "paid" | "pending" | "failed";
  children: string;
}) {
  const dot = {
    paid: "bg-success",
    pending: "bg-warning",
    failed: "bg-danger",
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2 py-0.5 text-xs">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/** Builder window plus the phone form and a payment receipt, all markup. */
function HeroProduct() {
  return (
    <div aria-hidden="true" className="relative pb-10 lg:pb-0">
      {/* Builder window */}
      <div className="tile overflow-hidden rounded-panel shadow-float">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
          </div>
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="size-1.5 rounded-full bg-success" />
            All changes saved
          </span>
          <span className="rounded-button bg-fg px-2.5 py-1 text-xs font-medium text-canvas">
            Publish
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:p-6 sm:pr-48">
          <p className="text-2xl font-medium tracking-tight">
            Spring Fest 2026
          </p>
          <p className="text-sm text-fg-muted">
            Pick a ticket and pay with UPI.
          </p>
          {["Full name", "Email"].map((label) => (
            <div
              key={label}
              className="rounded-card border border-line px-4 py-3"
            >
              <p className="text-xs text-fg-subtle">Short answer</p>
              <p className="font-medium">{label}</p>
            </div>
          ))}
          <div className="rounded-card border-2 border-fg/80 px-4 py-3">
            <p className="text-xs text-fg-subtle">Payment · Ticket tiers</p>
            <p className="font-medium">Ticket</p>
            <div className="mt-2 grid gap-1.5 text-sm">
              {[
                ["Early bird", "299"],
                ["Regular", "499"],
                ["VIP", "1,499"],
              ].map(([label, price]) => (
                <div
                  key={label}
                  className="flex justify-between rounded-input bg-canvas px-3 py-1.5"
                >
                  <span>{label}</span>
                  <span className="font-mono">₹{price}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="rounded-card border border-dashed border-line-strong px-4 py-2.5 text-sm text-fg-subtle">
            Type / to add a field
          </p>
        </div>
      </div>

      {/* Phone */}
      <div className="tile absolute top-16 right-6 hidden w-48 rounded-[26px] p-1.5 shadow-float sm:block">
        <div className="flex flex-col gap-2 rounded-[20px] bg-canvas p-3">
          <p className="text-[13px] leading-tight font-medium">
            Spring Fest 2026
          </p>
          {[
            ["Early bird", "299", false],
            ["Regular", "499", true],
          ].map(([label, price, on]) => (
            <div
              key={label as string}
              className={`flex items-center justify-between rounded-[8px] border bg-surface px-2 py-1.5 text-[11px] ${on ? "border-fg" : "border-line"}`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-2.5 rounded-full border ${on ? "border-[3px] border-fg" : "border-line-strong"}`}
                />
                {label}
              </span>
              <span className="font-mono">₹{price}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-1.5 text-[11px]">
            <span className="text-fg-muted">Total</span>
            <span className="font-mono font-medium">₹499</span>
          </div>
          <div className="rounded-[8px] bg-fg py-2 text-center text-[12px] font-medium text-canvas">
            Pay ₹499
          </div>
        </div>
      </div>

      {/* Receipt toast */}
      <div className="tile absolute -bottom-4 left-3 flex items-center gap-3 rounded-card px-3.5 py-2.5 shadow-float sm:left-6">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-tint text-brand">
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
        <span className="flex flex-col text-sm leading-tight">
          <span className="font-medium">
            Paid <span className="font-mono">₹499.00</span>
          </span>
          <span className="font-mono text-xs text-fg-subtle">
            UPI · R-8F2K41C9A0
          </span>
        </span>
      </div>
    </div>
  );
}

function PricingModes() {
  const rows: [string, string, string][] = [
    ["Fixed fee", "Workshop seat", "₹999"],
    ["Items", "T-shirt × 2", "₹798"],
    ["Tiers", "VIP pass", "₹1,499"],
    ["Pay what you want", "Donation", "₹2,500"],
  ];
  return (
    <div className="tile rounded-t-card border-b-0">
      {rows.map(([mode, example, amount]) => (
        <div
          key={mode}
          className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-sm"
        >
          <span className="w-36 shrink-0 text-fg-muted">{mode}</span>
          <span className="flex-1 truncate">{example}</span>
          <span className="font-mono">{amount}</span>
        </div>
      ))}
      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
        <span className="rounded-input border border-dashed border-line-strong px-2 py-0.5 font-mono text-xs">
          FEST20
        </span>
        <span className="font-mono text-brand">−20%</span>
      </div>
    </div>
  );
}

function ResponsesMini() {
  const rows: [string, "paid" | "pending" | "failed", string, string][] = [
    ["Aarav Mehta", "paid", "Paid", "₹499"],
    ["Diya Nair", "paid", "Paid", "₹1,499"],
    ["Kabir Singh", "pending", "Pending", "₹499"],
    ["Ishita Rao", "failed", "Failed", "₹299"],
  ];
  return (
    <div className="tile rounded-t-card border-b-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-fg-subtle">
        <span>124 responses</span>
        <span className="font-mono text-fg">₹48,210 collected</span>
      </div>
      {rows.map(([name, tone, label, amount]) => (
        <div
          key={name}
          className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0"
        >
          <span className="flex-1 truncate">{name}</span>
          <StatusDot tone={tone}>{label}</StatusDot>
          <span className="w-16 text-right font-mono">{amount}</span>
        </div>
      ))}
    </div>
  );
}

function RuleMini() {
  return (
    <div className="tile flex flex-col gap-3 rounded-t-card border-b-0 p-4 text-sm">
      <div className="rounded-input border border-line px-3 py-2">
        <p className="text-xs text-fg-subtle">Single choice</p>
        <p className="font-medium">Will you attend?</p>
        <div className="mt-1.5 flex gap-2 text-xs">
          <span className="rounded-pill border border-fg px-2 py-0.5">Yes</span>
          <span className="rounded-pill border border-line px-2 py-0.5 text-fg-muted">
            No
          </span>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
        Show next question when
        <span className="rounded-input bg-canvas px-1.5 py-0.5 text-fg">
          Will you attend?
        </span>
        is
        <span className="rounded-input bg-canvas px-1.5 py-0.5 text-fg">
          Yes
        </span>
      </p>
      <div className="rounded-input border border-line px-3 py-2">
        <p className="text-xs text-fg-subtle">Multiple choice · Conditional</p>
        <p className="font-medium">Meal preference</p>
      </div>
    </div>
  );
}

function ReceiptMini() {
  return (
    <div className="tile flex flex-col gap-3 rounded-t-card border-b-0 p-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-tint text-brand">
          <svg
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
        <span className="font-medium">See you at Spring Fest!</span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <p className="flex justify-between">
          <span className="text-fg-muted">Regular ticket</span>
          <span className="font-mono">₹499.00</span>
        </p>
        <p className="flex justify-between">
          <span className="text-fg-muted">Coupon FEST20</span>
          <span className="font-mono">−₹99.80</span>
        </p>
        <p className="flex justify-between border-t border-line pt-1.5 font-medium">
          <span>Paid</span>
          <span className="font-mono">₹399.20</span>
        </p>
      </div>
      <p className="font-mono text-xs text-fg-subtle">Receipt R-8F2K41C9A0</p>
    </div>
  );
}

function MoneyFlow() {
  const steps = [
    { title: "Respondent", sub: "Pays with any UPI app" },
    { title: "Your Razorpay", sub: "Your keys, your account" },
    { title: "Your bank", sub: "Settled to you" },
  ];
  return (
    <figure className="flex flex-col gap-3">
      <ol className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        {steps.map((s, i) => (
          <li key={s.title} className="contents">
            <div
              className={`tile flex flex-col gap-1 rounded-card p-4 ${i === 2 ? "border-brand" : ""}`}
            >
              <span className="font-medium">{s.title}</span>
              <span className="text-sm text-fg-muted">{s.sub}</span>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="justify-self-center text-fg-subtle sm:rotate-0"
              >
                <span className="sm:hidden">↓</span>
                <span className="hidden sm:inline">→</span>
              </span>
            )}
          </li>
        ))}
      </ol>
      <figcaption className="text-sm text-fg-subtle">
        UPI Forms sends the order to Razorpay and records the result. The money
        never passes through us.
      </figcaption>
    </figure>
  );
}
