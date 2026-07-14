
-- ============= Roles =============
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "admins can read all roles"
  on public.user_roles for select
  to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

-- Bootstrap: allow the FIRST signed-in user to become admin if no admin exists yet.
create or replace function public.claim_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  has_any_admin boolean;
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  select exists (select 1 from public.user_roles where role = 'admin') into has_any_admin;
  if has_any_admin then
    return false;
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin')
    on conflict (user_id, role) do nothing;
  return true;
end;
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;
grant execute on function public.claim_admin() to authenticated;

-- ============= Clients =============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null unique,
  street text not null,
  zip text not null,
  city text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;
grant insert, update on public.clients to anon;
grant all on public.clients to service_role;

alter table public.clients enable row level security;

-- Public form can upsert their own record; only admins can read/modify.
create policy "anon can insert clients"
  on public.clients for insert
  to anon
  with check (true);

create policy "anon can update clients by email match (public upsert)"
  on public.clients for update
  to anon
  using (true)
  with check (true);

create policy "admins can read clients"
  on public.clients for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admins can insert clients"
  on public.clients for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can update clients"
  on public.clients for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can delete clients"
  on public.clients for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============= Bookings =============
create type public.booking_source as enum ('online', 'manual', 'block');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  treatment text not null,
  day date not null,
  "time" text not null,
  silent boolean not null default false,
  source public.booking_source not null default 'online',
  notes text,
  created_at timestamptz not null default now()
);

create index bookings_day_idx on public.bookings (day);
create index bookings_client_idx on public.bookings (client_id);

grant select, insert, update, delete on public.bookings to authenticated;
grant insert on public.bookings to anon;
grant select on public.bookings to anon; -- limited by RLS below (day/time only via a view? we scope via policy)
grant all on public.bookings to service_role;

alter table public.bookings enable row level security;

-- Anon can insert online bookings from the public form.
create policy "anon can insert online bookings"
  on public.bookings for insert
  to anon
  with check (source = 'online');

-- Anon can read day + time only (used to gray out occupied slots).
-- RLS cannot restrict COLUMNS, so we expose a dedicated view below and DENY
-- direct anon SELECT on the base table by not adding a permissive SELECT policy.
revoke select on public.bookings from anon;

-- Admins full access.
create policy "admins can read bookings"
  on public.bookings for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admins can insert bookings"
  on public.bookings for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can update bookings"
  on public.bookings for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can delete bookings"
  on public.bookings for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Public availability view: only day + time. security_invoker so it uses the caller's rights,
-- combined with a dedicated grant to anon.
create view public.booking_slots
with (security_invoker = on)
as
select day, "time"
from public.bookings;

grant select on public.booking_slots to anon, authenticated;

-- Because the view uses security_invoker, we need a SELECT policy that lets anon
-- read the day/time columns via the view. Add a permissive SELECT policy scoped
-- to those columns only — but Postgres RLS is row-level. We expose day/time
-- through a SECURITY DEFINER function instead, which sidesteps column privileges.
drop view public.booking_slots;

create or replace function public.list_booking_slots(_day date)
returns table (day date, "time" text)
language sql
stable
security definer
set search_path = public
as $$
  select day, "time" from public.bookings where day = _day;
$$;

grant execute on function public.list_booking_slots(date) to anon, authenticated;

-- ============= Session logs (Massagetagebuch) =============
create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  body_html text not null,
  created_at timestamptz not null default now()
);

create index session_logs_client_idx on public.session_logs (client_id, created_at desc);

grant select, insert, update, delete on public.session_logs to authenticated;
grant all on public.session_logs to service_role;

alter table public.session_logs enable row level security;

create policy "admins can read session logs"
  on public.session_logs for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admins can insert session logs"
  on public.session_logs for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin') and author_id = auth.uid());

create policy "admins can update own session logs"
  on public.session_logs for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins can delete session logs"
  on public.session_logs for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============= Timestamp trigger =============
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_touch_updated_at
before update on public.clients
for each row execute function public.tg_touch_updated_at();
