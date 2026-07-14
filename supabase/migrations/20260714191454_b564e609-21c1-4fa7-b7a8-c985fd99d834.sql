
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Also allow every signed-in user to read their OWN role row so has_role()
-- (security invoker) can return true for themselves.
create policy "users can read own role"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

drop function if exists public.claim_admin();
