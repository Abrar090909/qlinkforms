-- Builder drafts, frozen price breakdowns and a rate-limit table.

-- forms: the editable draft lives here; publishing copies it into an
-- immutable form_versions row.
alter table public.forms
  add column "draft_json" jsonb not null default '{}'::jsonb,
  add column "published_at" timestamptz(6);

-- submissions: what was charged, line by line, at submit time, so receipts
-- never change if the form is edited later. Plus the payer email for receipts.
alter table public.submissions
  add column "pricing_json" jsonb,
  add column "respondent_email" text;

-- Fixed-window rate limits for public endpoints. Server-only: RLS on, no
-- policies, no grants (like webhook_events).
create table public.rate_limits (
  "key" text primary key,
  "window_start" timestamptz(6) not null,
  "count" integer not null default 0 check ("count" >= 0)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- One payment row per provider order, so a retried "create order" can't
-- produce two rows for the same order.
create unique index "payments_provider_order_id_key" on public.payments ("provider_order_id");
drop index if exists public."payments_provider_order_id_idx";

-- Coupon codes are matched case-insensitively; store them upper-case.
alter table public.coupons
  add constraint coupons_code_format check ("code" ~ '^[A-Z0-9_-]{2,40}$');
