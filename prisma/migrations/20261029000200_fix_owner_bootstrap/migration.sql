-- The owner-bootstrap branch of memberships_insert looked up the workspace
-- through RLS, but a brand-new owner is not a member yet and can't see it.
-- Check ownership with a SECURITY DEFINER helper instead.

create function private.owns_workspace(ws uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = ws and w.owner_id = private.uid()
  )
$$;

revoke all on function private.owns_workspace(uuid) from public;
grant execute on function private.owns_workspace(uuid) to authenticated;

drop policy memberships_insert on public.memberships;
create policy memberships_insert on public.memberships for insert to authenticated
  with check (
    private.has_role(workspace_id, '{owner,admin}')
    -- Bootstrap: the workspace owner adds themselves as owner.
    or (
      user_id = (select private.uid())
      and role = 'owner'
      and private.owns_workspace(workspace_id)
    )
  );
