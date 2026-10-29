import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FadeUp, Parallax, RevealLines } from "@/components/marketing/motion";
import { buttonClasses } from "@/components/ui/button";

// Landing page in the Midnight style (DESIGN.md section 6): cinematic dark
// sections, huge tight type, line reveals, glass panels, one CTA per section.
// All copy and visuals are ours; nothing is taken from the lafys prompts.

const useCases = [
  "Coaching fees",
  "Event tickets",
  "Donations",
  "Workshop seats",
  "Instagram orders",
  "Memberships",
  "College fests",
  "Consultations",
];

const steps = [
  {
    n: "01",
    title: "Build it like a document",
    body: "Type your questions. Press / to add fields: choices, dates, ratings and a payment block. Start from a template if you like.",
  },
  {
    n: "02",
    title: "Connect your Razorpay",
    body: "Paste your own API keys once. Every rupee settles straight into your account. We never touch the money.",
  },
  {
    n: "03",
    title: "Share one link",
    body: "Send it on WhatsApp, print the QR code, put it in your bio. People fill it in and pay with any UPI app.",
  },
];

const features = [
  {
    title: "UPI first",
    body: "Respondents pay with GPay, PhonePe, Paytm or any UPI app, plus cards and netbanking, without leaving your form.",
  },
  {
    title: "Prices you control",
    body: "Fixed fees, items with quantities, ticket tiers or pay-what-you-want donations, with coupon codes.",
  },
  {
    title: "Amounts you can trust",
    body: "Totals are worked out on our server from your form. Nobody can edit a price in their browser.",
  },
  {
    title: "Questions that adapt",
    body: "Show a question only when an earlier answer matches. Long forms stay short for each person.",
  },
  {
    title: "Every response, live",
    body: "See who paid, who is pending and who dropped off. Search, filter and export to a spreadsheet.",
  },
  {
    title: "Receipts, automatically",
    body: "Each payer gets a receipt number on screen and by email. You get a heads-up for every response.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <header className="glass fixed inset-x-0 top-0 z-50 border-x-0 border-t-0">
        <nav
          aria-label="Main"
          className="mx-auto flex w-full max-w-marketing items-center justify-between gap-4 px-4 py-3 sm:px-8"
        >
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Logo />
            <span className="hidden min-[400px]:inline">UPI Forms</span>
          </Link>
          <div className="hidden items-center gap-1 text-sm text-fg-muted md:flex">
            <a href="#how" className="rounded-pill px-4 py-2 hover:text-fg">
              How it works
            </a>
            <a
              href="#features"
              className="rounded-pill px-4 py-2 hover:text-fg"
            >
              Features
            </a>
            <a href="#pricing" className="rounded-pill px-4 py-2 hover:text-fg">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/login"
              className={buttonClasses({
                variant: "ghost",
                className: "px-4 text-sm",
              })}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={buttonClasses({
                pill: true,
                className: "px-5 text-sm",
              })}
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="grain relative isolate overflow-hidden pt-32 pb-20 sm:pt-44 sm:pb-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[-20%] left-1/2 -z-10 size-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(222_125_77/0.28),transparent_62%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-10%] bottom-[-30%] -z-10 size-[600px] rounded-full bg-[radial-gradient(circle,rgb(139_137_240/0.12),transparent_65%)]"
          />
          <div className="mx-auto flex w-full max-w-marketing flex-col gap-8 px-4 sm:px-8">
            <FadeUp>
              <p className="inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1.5 text-eyebrow text-fg-muted uppercase">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-accent"
                />
                Forms with payments, made for India
              </p>
            </FadeUp>
            <RevealLines
              as="h1"
              lines={["Forms that", "get you paid."]}
              className="text-display font-light"
            />
            <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
              <FadeUp delay={0.3} className="flex max-w-xl flex-col gap-8">
                <p className="text-xl text-fg-muted">
                  Registrations, fees, orders and donations in one link. People
                  fill it in and pay with any UPI app, and the money lands in
                  your own Razorpay account.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className={buttonClasses({ size: "lg", pill: true })}
                  >
                    Create a free form
                  </Link>
                  <a
                    href="#how"
                    className={buttonClasses({
                      size: "lg",
                      pill: true,
                      variant: "secondary",
                    })}
                  >
                    See how it works
                  </a>
                </div>
              </FadeUp>
              <Parallax className="relative mx-auto w-full max-w-sm lg:mx-0 lg:-mb-16">
                <ProductMock />
              </Parallax>
            </div>
          </div>
        </section>

        {/* Use cases marquee */}
        <section aria-label="Made for" className="border-y border-line py-6">
          <p className="sr-only">Made for {useCases.join(", ")}.</p>
          <div
            aria-hidden="true"
            className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
          >
            <ul className="flex shrink-0 animate-[marquee_40s_linear_infinite] gap-12 pr-12 motion-reduce:animate-none">
              {[...useCases, ...useCases].map((u, i) => (
                <li
                  key={i}
                  className="text-2xl font-light whitespace-nowrap text-fg-muted"
                >
                  {u}
                  <span className="ml-12 text-accent">✦</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="mx-auto w-full max-w-marketing scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32"
        >
          <p className="mb-6 text-eyebrow text-fg-muted uppercase">
            How it works
          </p>
          <RevealLines
            lines={["Live in three minutes.", "Paid in seconds."]}
            className="max-w-4xl text-heading font-normal"
          />
          <ol className="mt-16 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.n}>
                <FadeUp
                  delay={i * 0.1}
                  className="glass flex h-full flex-col gap-6 rounded-panel p-7"
                >
                  <span className="text-[48px] leading-none font-light text-accent tabular-nums">
                    {s.n}
                  </span>
                  <h3 className="text-2xl font-normal tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-fg-muted">{s.body}</p>
                </FadeUp>
              </li>
            ))}
          </ol>
        </section>

        {/* Money flow */}
        <section className="relative isolate overflow-hidden border-y border-line bg-[rgb(255_255_255/0.02)] py-24 sm:py-32">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-0 -z-10 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(222_125_77/0.16),transparent_65%)]"
          />
          <div className="mx-auto grid w-full max-w-marketing items-center gap-16 px-4 sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <p className="text-eyebrow text-fg-muted uppercase">
                Your money, your account
              </p>
              <RevealLines
                lines={["We never hold", "a single rupee."]}
                className="text-heading font-normal"
              />
              <FadeUp className="flex max-w-lg flex-col gap-4 text-lg text-fg-muted">
                <p>
                  Payments go from your respondent through Razorpay straight to
                  your bank. Your keys are encrypted, and refunds and
                  settlements stay in your Razorpay dashboard.
                </p>
                <p>
                  No middleman wallet, no waiting for payouts, and no extra
                  commission from us on your money. Razorpay&apos;s standard
                  fees apply.
                </p>
              </FadeUp>
            </div>
            <FadeUp delay={0.15}>
              <MoneyFlow />
            </FadeUp>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto w-full max-w-marketing scroll-mt-24 px-4 py-24 sm:px-8 sm:py-32"
        >
          <p className="mb-6 text-eyebrow text-fg-muted uppercase">Features</p>
          <RevealLines
            lines={["Everything a form needs", "to take money well."]}
            className="max-w-4xl text-heading font-normal"
          />
          <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <li key={f.title}>
                <FadeUp
                  delay={(i % 3) * 0.08}
                  className="glass group flex h-full flex-col gap-3 rounded-panel p-7 transition-colors hover:border-line-strong"
                >
                  <span
                    aria-hidden="true"
                    className="mb-4 flex size-10 items-center justify-center rounded-full border border-line text-accent transition-colors group-hover:border-accent"
                  >
                    ✦
                  </span>
                  <h3 className="text-xl font-normal tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-fg-muted">{f.body}</p>
                </FadeUp>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="mx-auto w-full max-w-marketing scroll-mt-24 px-4 pb-24 sm:px-8 sm:pb-32"
        >
          <div className="glass relative isolate grid gap-10 overflow-hidden rounded-panel p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-40 -bottom-40 -z-10 size-[520px] rounded-full bg-[radial-gradient(circle,rgb(222_125_77/0.22),transparent_65%)]"
            />
            <div className="flex flex-col gap-5">
              <p className="text-eyebrow text-fg-muted uppercase">Pricing</p>
              <h2 className="text-heading font-normal">
                Free while we&apos;re in beta.
              </h2>
              <p className="max-w-lg text-lg text-fg-muted">
                Unlimited forms and responses. You only pay Razorpay&apos;s
                standard payment fees, directly to Razorpay.
              </p>
            </div>
            <ul className="flex flex-col gap-3 text-lg">
              {[
                "Unlimited forms",
                "UPI, cards and netbanking",
                "Coupons, tiers and items",
                "CSV export",
                "Email receipts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-6 items-center justify-center rounded-full bg-accent text-sm text-accent-fg"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="grain relative isolate overflow-hidden border-t border-line py-28 text-center sm:py-40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[-60%] -z-10 mx-auto size-[1000px] rounded-full bg-[radial-gradient(circle,rgb(222_125_77/0.3),transparent_60%)]"
          />
          <div className="mx-auto flex max-w-marketing flex-col items-center gap-10 px-4 sm:px-8">
            <RevealLines
              lines={["Stop chasing", "payment screenshots."]}
              className="text-display font-light"
            />
            <FadeUp delay={0.2}>
              <Link
                href="/signup"
                className={buttonClasses({ size: "lg", pill: true })}
              >
                Create your first form
              </Link>
            </FadeUp>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-marketing flex-col gap-4 px-4 py-10 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="flex items-center gap-2">
            <Logo className="size-5" />
            UPI Forms
          </span>
          <nav aria-label="Footer" className="flex gap-6">
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

/** A phone-sized glass mock of a payment form. Pure markup, no images. */
function ProductMock() {
  const tiers: [string, string, boolean][] = [
    ["Early bird", "₹299", true],
    ["Regular", "₹499", false],
    ["VIP", "₹1,499", false],
  ];
  return (
    <div aria-hidden="true" className="relative">
      <div className="glass rounded-[40px] p-3">
        <div className="flex flex-col gap-4 rounded-[30px] bg-canvas p-6">
          <p className="text-xs text-fg-muted">Spring Fest 2026</p>
          <p className="text-2xl font-normal tracking-tight">
            Get your tickets
          </p>
          <div className="flex flex-col gap-2">
            {tiers.map(([label, price, on]) => (
              <div
                key={label}
                className={`flex items-center justify-between rounded-input border px-4 py-3 text-sm ${on ? "border-accent bg-accent/10" : "border-line"}`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`size-3.5 rounded-full border-2 ${on ? "border-accent bg-accent" : "border-line-strong"}`}
                  />
                  {label}
                </span>
                <span className="tabular-nums">{price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-fg-muted">Total</span>
            <span className="tabular-nums">₹299</span>
          </div>
          <div className="flex min-h-12 items-center justify-center rounded-button bg-accent font-medium text-accent-fg">
            Pay ₹299
          </div>
        </div>
      </div>
      <div className="glass absolute -bottom-6 -left-4 flex items-center gap-3 rounded-card bg-surface-solid/80 px-4 py-3 sm:-left-12">
        <span className="flex size-9 items-center justify-center rounded-full bg-success/15 text-success">
          ✓
        </span>
        <span className="flex flex-col text-sm">
          <span className="font-medium">₹299 received</span>
          <span className="text-xs text-fg-muted">via UPI · just now</span>
        </span>
      </div>
    </div>
  );
}

/** Respondent -> Razorpay -> your bank, with us off to the side. */
function MoneyFlow() {
  const nodes = [
    { title: "Respondent", sub: "Pays with any UPI app" },
    { title: "Razorpay", sub: "Your account, your keys" },
    { title: "Your bank", sub: "Settled to you directly" },
  ];
  return (
    <figure className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {nodes.map((n, i) => (
          <li key={n.title} className="flex flex-col items-center gap-3">
            <div
              className={`glass flex w-full flex-wrap items-center justify-between gap-2 rounded-card px-6 py-5 ${i === 2 ? "border-accent/60" : ""}`}
            >
              <span className="text-xl font-normal">{n.title}</span>
              <span className="text-sm text-fg-muted">{n.sub}</span>
            </div>
            {i < nodes.length - 1 && (
              <span aria-hidden="true" className="text-accent">
                ↓
              </span>
            )}
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 rounded-card border border-dashed border-line px-6 py-4 text-sm text-fg-muted">
        UPI Forms only sends the form and the order to Razorpay. The money never
        passes through us.
      </figcaption>
    </figure>
  );
}
