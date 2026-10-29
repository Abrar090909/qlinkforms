# UPI Forms: Technical Plan (working title)

Prepared for Ahmed · October 29, 2026 · Draft v1

## 1. Summary

Build an India-first online form builder where any form can collect UPI, card and netbanking payments on submit, with funds settling directly into the owner's own payment gateway account.

The wedge: Typeform, Jotform and Paperform are global and treat Indian payments as an afterthought. The closest India-focused tool, Formpey (per its Peerlist listing: document-style editor, Razorpay-based UPI, 0% commission, free unlimited forms), is early. We compete on builder quality, India-specific payment UX, and SEO around niche use cases.

This document scopes the MVP, payment architecture, data model, UX direction and a 6-week build plan.

## 2. Target users and use cases

- Coaching classes and tutors: admission and fee forms
- College fests, clubs, workshops: event registration with ticket tiers
- Small sellers on Instagram and WhatsApp: order forms with quantity and coupons
- Freelancers and agencies: advance or booking payments
- NGOs, trusts, communities: donation forms with a user-entered amount

Primary persona: a non-technical Indian small business owner on a phone who currently collects payments through screenshots on WhatsApp.

## 3. Design inspiration: what to borrow

Take patterns, not pixels. Do not copy branding, copy or assets.

- **Typeform:** one-question-at-a-time conversational mode, large type, keyboard and swipe navigation, smooth progress feedback. Offer it as a layout toggle, not the only mode, because long forms and payment summaries read better as a page.
- **Paperform:** document-style editor where you type and press / to insert fields, live preview beside the editor, strong theming, payment as a native block. This is the core editing model.
- **Jotform:** template gallery by use case, breadth of field types, conditional logic UI, clear settings tabs, long integrations list. Borrow the template-first onboarding and settings structure; avoid its dense builder.
- **Formpey (direct competitor):** document-style builder plus UPI. Study its onboarding and gaps, and verify its free-plan limits yourself.
- **Google Forms:** the baseline everyone knows. The first form must be as easy to create as this.

Design principles: mobile first (most respondents pay from a phone); one primary action per screen; the payment step shows an order summary then a single Pay button; fast (public form under 100 KB of JS, loads on 4G in under 2 seconds); accessible (WCAG AA contrast, keyboard operable).

## 4. MVP scope

**P0 (launch)**

- Auth (email and Google), workspaces
- Document-style builder with / menu. Fields: short and long text, email, phone, number, dropdown, single and multi choice, date, file upload, rating, payment block
- Payment block modes: fixed amount, per-item with quantity, tiers, user-entered amount (donations), coupon codes
- Conditional logic (show or hide a field, jump to a section)
- Public form page with themes, custom thank-you page, receipt email
- Razorpay integration using the owner's own account
- Responses table with payment status, search and CSV export
- Owner notification email
- 10 templates by use case

**P1:** WhatsApp notifications, embed (iframe and script), custom domains, webhooks, Zapier and Google Sheets, GST invoice PDFs, refunds from the dashboard, Cashfree and PayU adapters, Hindi and regional UI, team members, analytics (views, drop-off, conversion).

**P2:** Razorpay OAuth partner connection, installments and subscriptions, one-question-at-a-time mode, AI form generation, manual UPI mode (owner-verified).

## 5. Payments architecture (the critical part)

Principle: we never hold or move user money. Each owner connects their own gateway account and funds settle straight to them. This avoids RBI payment aggregator licensing and keeps our compliance load small.

### Integration model

- **MVP: bring your own keys.** The owner pastes their Razorpay Key ID and Secret. Store the secret encrypted (envelope encryption with a KMS key), decrypt only inside the payment service, and never return it to the client. The owner also adds our webhook URL and a webhook secret.
- **P1:** Razorpay OAuth (partner) so there are no secrets to paste. Check current Razorpay partner program terms first.
- Build a PaymentProvider interface (createOrder, verifyPayment, parseWebhook, refund) so Cashfree, PayU and Instamojo can be added without touching form logic.

### Payment flow

1. Respondent submits. The server validates answers against the form version schema.
2. The server computes the amount from the schema (items, quantity, coupon). Never trust an amount sent by the client.
3. Create a submission (status pending\_payment) and a provider order with the submission id in its notes. Store a payment row (status created).
4. The client opens Razorpay Checkout with the order id. On mobile it shows UPI apps (intent flow); on desktop, a QR.
5. On the success callback the client posts payment id and signature. The server verifies the HMAC signature and marks the payment paid.
6. Webhooks (payment.captured, order.paid, payment.failed, refund.processed) are the source of truth. Verify the signature, dedupe by event id, process idempotently, and update state even if the browser closed mid-payment.
7. A reconciliation job runs every 15 minutes: fetch orders still created or pending past a timeout and sync them from the provider API.
8. On paid: mark the submission complete, send the receipt and owner notification, fire integrations.

State machines: submission goes draft, pending\_payment, then paid, failed or expired. Payment goes created, authorized, captured, then refunded (partial or full) or failed.

### Edge cases to handle explicitly

- Double-click on Pay
- Abandoned payment followed by resubmission
- UPI pending state (can take minutes)
- Webhook arriving before the client callback
- Amount mismatch (flag and alert)
- Owner revokes keys (disable the form with a clear message)
- Form edited after submissions exist (always bind a submission to an immutable form version)
- Partial refunds
- Duplicate webhook delivery

Do not depend on UPI collect requests (pushing a request to a typed VPA). NPCI and PSPs have restricted these, so use intent and QR through the gateway. Verify current rules in Razorpay docs before building.

### Compliance checklist (confirm with a professional)

- No custody of funds. Gateway KYC is the owner's responsibility, so ship a clear onboarding guide, since KYC approval is the biggest user friction.
- Card data never touches our servers (hosted Checkout).
- DPDP Act 2023: the owner is the data fiduciary and we are the processor. Provide a privacy policy, consent text on forms, data export and deletion, and a breach process.
- GST: invoice our own subscription charges with GST.
- Terms: prohibit unlawful use and follow the gateway's prohibited-business list.

## 6. System architecture

Stack (matches what you already use): Next.js (App Router), TypeScript, Tailwind, Postgres via Supabase, Prisma. Hosting on Vercel with Supabase in the Mumbai region for latency.

- **Public form renderer:** separate route group, server-rendered, minimal JS, cached at the edge per form version.
- **Builder app:** authenticated client app. Editor state is a block tree with autosave every few seconds and optimistic versioning.
- **API:** route handlers and server actions, with zod schemas shared between client and server.
- **Background jobs:** Inngest or Trigger.dev for webhook processing, emails, reconciliation and exports (retries, idempotency).
- **Abuse protection:** Upstash Redis rate limits and Cloudflare Turnstile on public submit.
- **Files:** Supabase Storage or S3 with signed URLs, size and type limits, malware scan before owner download (P1).
- **Email:** Resend. **WhatsApp:** Meta Cloud API (P1).
- **Observability:** Sentry, structured logs carrying submission and payment IDs, uptime checks, alerts on webhook failures and reconciliation mismatches.

## 7. Data model (core tables)

```
users(id, email, name, created_at)
workspaces(id, owner_id, name, plan)
memberships(workspace_id, user_id, role)
forms(id, workspace_id, slug, title, status, current_version_id, theme_id)
form_versions(id, form_id, schema_json, created_at)   -- immutable
submissions(id, form_id, form_version_id, answers_json, status, amount_minor, currency, created_at)
payments(id, submission_id, provider, provider_order_id, provider_payment_id, status, amount_minor, fee_minor, raw_json)
payment_accounts(id, workspace_id, provider, key_id, secret_encrypted, webhook_secret_encrypted, status)
webhook_events(id, provider, event_id UNIQUE, payload_json, processed_at)
coupons(id, form_id, code, type, value, max_uses, used, expires_at)
files(id, submission_id, path, size, mime)
audit_log(id, workspace_id, actor_id, action, meta_json, created_at)
```

Store money as integer paise. Use Row Level Security so workspace data is isolated. Index submissions by (form\_id, created\_at) and payments by provider\_order\_id.

**Form schema:** a version holds an ordered list of blocks. Each block has an id, type, label, required flag, validation, and an optional visibility rule. Payment blocks carry a pricing config (mode, items, tax, currency INR, coupon support). Shared TypeScript types and a zod schema validate it everywhere.

## 8. Builder and form UX spec

- **Editor:** document canvas on the left (type text, press / for fields), live phone-width preview on the right, top bar with Publish and share link. Drag handle to reorder. Inline field settings popover.
- **Payment block UI:** choose a mode, add items with prices, set quantity limits, toggle coupons, preview the total.
- **Publish flow:** pick a slug, copy the link, get a QR code and a WhatsApp share button.
- **Respondent view:** page layout by default; payment summary card (items, discount, total); a single Pay button; clear failure and retry state; success screen with receipt number.
- **Themes:** 6 presets built from font, color and radius tokens. Dark mode follows the system setting.
- **First run:** template gallery, then a pre-filled editor, so the first form is live in under 3 minutes.

## 9. Security checklist

- Server-side amount computation
- Webhook signature verification and idempotency keys
- Encrypted secrets, least-privilege DB roles, Row Level Security
- CSRF protection and rate limits per IP and per form
- Sanitise stored answers (prevent XSS in the responses table and CSV formula injection in exports)
- Audit log for key changes and exports
- Daily encrypted backups and a tested restore

## 10. Testing plan

- **Unit:** pricing engine (items, tax, coupons, rounding), conditional logic, schema validation.
- **Integration:** payment state machine against Razorpay test mode; replay webhooks including out-of-order and duplicate events.
- **E2E (Playwright, mobile viewport):** create form, publish, submit, pay in test mode, see the paid response.
- **Load:** 500 concurrent submissions on one form (event ticket rush).
- **Manual:** real small-value UPI payments on 3 apps before launch.

## 11. 6-week build plan (solo, with Claude Code)

- **Week 1:** repo, auth, workspaces, DB schema, design tokens, CI.
- **Week 2:** document-style editor, block types, autosave, preview.
- **Week 3:** public renderer, submissions, responses table, CSV export, themes.
- **Week 4:** Razorpay end to end (orders, signature check, webhooks, reconciliation), coupons.
- **Week 5:** templates, emails, conditional logic, dashboard polish, rate limits, Sentry.
- **Week 6:** private beta with 10 real users (coaching classes, event organisers), fixes, landing page and pricing, launch.

## 12. Go-to-market and SEO

- Programmatic template pages, one per use case: UPI payment form for coaching classes, event registration form with UPI payment, donation form with UPI, and so on. Each page has a live builder and an example form.
- Target long-tail queries first, and check page one for small sites before committing to each.
- Distribution beyond SEO: coaching and college-fest communities, Instagram seller groups, Product Hunt, Peerlist.
- Pricing hypotheses to test: a free tier (limited responses per month, small footer badge) and a low-priced Pro plan. Differentiate beyond a 0% commission claim: better builder, WhatsApp notifications, receipts and GST invoices, coupons.

## 13. Risks and open decisions

1. **Gateway KYC friction.** Owners need an approved Razorpay account. Mitigation: onboarding guide, multiple gateways, and an optional manual UPI mode (owner verifies payments) for tiny organisers.
2. **Dependence on Razorpay terms and API changes.** Mitigation: the provider interface.
3. **Competition** from Formpey and global players localising. Mitigation: speed, niche templates, WhatsApp.
4. **SEO takes 6-12 months.** Mitigation: community distribution from week 6.
5. **Data protection obligations under DPDP.** Mitigation: privacy by design, minimal data, deletion tooling.

**Decisions needed:** product name and domain; free-tier limits; bring-your-own-keys (recommended) versus applying for Razorpay partner access; which 3 templates to build first.

## 14. Next step

Approve the scope, then start Week 1. Next I can generate the repo scaffold, schema migrations and a CLAUDE.md for this project.
