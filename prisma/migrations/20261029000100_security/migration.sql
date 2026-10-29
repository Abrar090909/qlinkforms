-- Security layer: check constraints, immutability triggers, Data API grants and
-- Row Level Security. Hand-written; Prisma does not model any of this, and
-- `prisma migrate diff` leaves it alone.
--
-- The app talks to Postgres through Prisma as the table owner, which bypasses
-- RLS. These policies guard the Supabase Data API (anon/authenticated roles)
-- and act as defence in depth. Tests: tests/db/rls.test.ts.

-- ---------------------------------------------------------------------------
-- Check constraints
-- ---------------------------------------------------------------------------

alter table public.submissions
  add constraint submissions_amount_minor_check check (amount_minor >= 0),
  add constraint submissions_currency_check check (currency = 'INR');

alter table public.payments
  add constraint payments_amount_minor_check check (amount_minor >= 0),
  add constraint payments_fee_minor_check check (fee_minor is null or fee_minor >= 0);

alter table public.coupons
  add constraint coupons_value_check check (
    (type = 'percent' and value between 1 and 10000)
    or (type = 'fixed' and value > 0)
  ),
  add constraint coupons_max_uses_check check (max_uses is null or max_uses > 0),
  add constraint coupons_used_check check (used >= 0);

alter table public.files
  add constraint files_size_check check (size >= 0);

-- ---------------------------------------------------------------------------
-- Helpers in a schema the Data API does not expose
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Same as Supabase's auth.uid(): the "sub" claim of the request JWT. Defined
-- here so migrations don't depend on the auth schema (absent in Prisma's
-- shadow database).
create function private.uid() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;

-- SECURITY DEFINER so policies can read memberships without recursing into
-- the memberships policies themselves.
create function private.is_member(ws uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = private.uid()
  )
$$;

create function private.has_role(ws uuid, roles public.membership_role[]) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = private.uid() and m.role = any (roles)
  )
$$;

create function private.form_workspace(f uuid) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select workspace_id from public.forms where id = f
$$;

create function private.submission_workspace(s uuid) returns uuid
language sql stable security definer
set search_path = ''
as $$
  select f.workspace_id
  from public.submissions sub
  join public.forms f on f.id = sub.form_id
  where sub.id = s
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Immutability
-- ---------------------------------------------------------------------------

create function private.reject_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are immutable', tg_table_name
    using errcode = 'restrict_violation';
end
$$;

create trigger form_versions_immutable
  before update on public.form_versions
  for each row execute function private.reject_update();

create trigger audit_log_immutable
  before update on public.audit_log
  for each row execute function private.reject_update();

-- ---------------------------------------------------------------------------
-- Data API grants: nothing by default, then only what each table needs
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Future tables start closed too; each migration grants explicitly.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.forms to authenticated;
grant select, insert on public.form_versions to authenticated;
grant select, update, delete on public.submissions to authenticated;
grant select on public.payments to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant select on public.files to authenticated;
grant select on public.audit_log to authenticated;
-- Secrets are not readable through the Data API, even by the owner.
grant select (id, workspace_id, provider, key_id, status, created_at, updated_at)
  on public.payment_accounts to authenticated;
-- webhook_events: server only, no grants.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.forms enable row level security;
alter table public.form_versions enable row level security;
alter table public.submissions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.webhook_events enable row level security;
alter table public.coupons enable row level security;
alter table public.files enable row level security;
alter table public.audit_log enable row level security;
alter table if exists public._prisma_migrations enable row level security;

-- profiles: your own row only
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select private.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select private.uid()))
  with check (id = (select private.uid()));

-- workspaces
create policy workspaces_select on public.workspaces for select to authenticated
  using (private.is_member(id));
create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (owner_id = (select private.uid()));
create policy workspaces_update on public.workspaces for update to authenticated
  using (private.has_role(id, '{owner,admin}'))
  with check (private.has_role(id, '{owner,admin}'));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (private.has_role(id, '{owner}'));

-- memberships
create policy memberships_select on public.memberships for select to authenticated
  using (private.is_member(workspace_id));
create policy memberships_insert on public.memberships for insert to authenticated
  with check (
    private.has_role(workspace_id, '{owner,admin}')
    -- Bootstrap: the workspace owner adds themselves as owner.
    or (
      user_id = (select private.uid())
      and role = 'owner'
      and exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = (select private.uid())
      )
    )
  );
create policy memberships_update on public.memberships for update to authenticated
  using (private.has_role(workspace_id, '{owner,admin}'))
  with check (private.has_role(workspace_id, '{owner,admin}'));
create policy memberships_delete on public.memberships for delete to authenticated
  using (
    private.has_role(workspace_id, '{owner,admin}')
    or user_id = (select private.uid())
  );

-- forms
create policy forms_all on public.forms for all to authenticated
  using (private.is_member(workspace_id))
  with check (private.is_member(workspace_id));

-- form_versions: read and append only
create policy form_versions_select on public.form_versions for select to authenticated
  using (private.is_member(private.form_workspace(form_id)));
create policy form_versions_insert on public.form_versions for insert to authenticated
  with check (private.is_member(private.form_workspace(form_id)));

-- submissions: created server-side; members read, update and delete
create policy submissions_select on public.submissions for select to authenticated
  using (private.is_member(private.form_workspace(form_id)));
create policy submissions_update on public.submissions for update to authenticated
  using (private.is_member(private.form_workspace(form_id)))
  with check (private.is_member(private.form_workspace(form_id)));
create policy submissions_delete on public.submissions for delete to authenticated
  using (private.is_member(private.form_workspace(form_id)));

-- payments: read only
create policy payments_select on public.payments for select to authenticated
  using (private.is_member(private.submission_workspace(submission_id)));

-- payment_accounts: owners and admins see non-secret columns
create policy payment_accounts_select on public.payment_accounts for select to authenticated
  using (private.has_role(workspace_id, '{owner,admin}'));

-- webhook_events and _prisma_migrations: RLS on, no policies, no grants.

-- coupons
create policy coupons_all on public.coupons for all to authenticated
  using (private.is_member(private.form_workspace(form_id)))
  with check (private.is_member(private.form_workspace(form_id)));

-- files: read only
create policy files_select on public.files for select to authenticated
  using (private.is_member(private.submission_workspace(submission_id)));

-- audit_log: owners and admins read
create policy audit_log_select on public.audit_log for select to authenticated
  using (private.has_role(workspace_id, '{owner,admin}'));
