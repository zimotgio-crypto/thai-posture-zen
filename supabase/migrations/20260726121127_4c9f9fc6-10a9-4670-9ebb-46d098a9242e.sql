-- ============ 1) new tables ============
create table public.studios (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  street text,
  zip text,
  city text,
  country text default 'CH',
  phone text,
  email text,
  timezone text not null default 'Europe/Zurich',
  buffer_minutes int not null default 15,
  slot_step_minutes int not null default 15,
  opening_hours jsonb not null default '{}'::jsonb,
  google_calendar_id text,
  whatsapp_phone_number_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.studios to authenticated;
grant all on public.studios to service_role;

create table public.studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (studio_id, user_id)
);
grant select on public.studio_members to authenticated;
grant all on public.studio_members to service_role;

create table public.platform_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
grant select on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (studio_id, key)
);
grant select, insert, update, delete on public.treatments to authenticated;
grant select on public.treatments to anon;
grant all on public.treatments to service_role;

-- ============ 2) helper functions ============
create or replace function public.is_platform_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = _user_id);
$$;

create or replace function public.is_studio_member(_user_id uuid, _studio_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.studio_members
    where user_id = _user_id and studio_id = _studio_id
  ) or exists (select 1 from public.platform_admins where user_id = _user_id);
$$;

-- ============ 3) studio_id on existing tables (nullable first) ============
alter table public.clients add column studio_id uuid references public.studios(id) on delete cascade;
alter table public.bookings add column studio_id uuid references public.studios(id) on delete cascade;
alter table public.session_logs add column studio_id uuid references public.studios(id) on delete cascade;
alter table public.whatsapp_sessions add column studio_id uuid references public.studios(id) on delete cascade;

-- ============ 4) seed studio + treatments, backfill ============
insert into public.studios (slug, name, street, zip, city, country, timezone, buffer_minutes, slot_step_minutes, opening_hours)
values (
  'tpl-zuzwil',
  'Thai Posture Lab',
  'Eschenstrasse 24',
  '9524',
  'Zuzwil',
  'CH',
  'Europe/Zurich',
  15,
  15,
  '{"0": null, "1": {"open": 540, "close": 1200}, "2": {"open": 540, "close": 1200}, "3": {"open": 540, "close": 1200}, "4": {"open": 540, "close": 1200}, "5": {"open": 540, "close": 1200}, "6": {"open": 600, "close": 1080}}'::jsonb
);

insert into public.treatments (studio_id, key, label, sort_order, options)
select s.id, v.key, v.label, v.sort_order, v.options::jsonb
from public.studios s,
(values
  ('deep-release', 'Home-Office Deep Release', 0, '[{"minutes":30,"price":60},{"minutes":60,"price":100},{"minutes":90,"price":150},{"minutes":120,"price":200}]'),
  ('thai-stretch-oil', 'Traditional Thai Stretch', 1, '[{"minutes":60,"price":110},{"minutes":90,"price":160},{"minutes":120,"price":210}]'),
  ('zuzwiler', 'Sport Massage', 2, '[{"minutes":60,"price":120},{"minutes":90,"price":170},{"minutes":120,"price":230}]')
) as v(key, label, sort_order, options)
where s.slug = 'tpl-zuzwil';

update public.clients set studio_id = (select id from public.studios where slug = 'tpl-zuzwil') where studio_id is null;
update public.bookings set studio_id = (select id from public.studios where slug = 'tpl-zuzwil') where studio_id is null;
update public.session_logs set studio_id = (select id from public.studios where slug = 'tpl-zuzwil') where studio_id is null;
update public.whatsapp_sessions set studio_id = (select id from public.studios where slug = 'tpl-zuzwil') where studio_id is null;

insert into public.studio_members (studio_id, user_id, role)
select (select id from public.studios where slug = 'tpl-zuzwil'), ur.user_id, 'owner'
from public.user_roles ur
where ur.role = 'admin'
on conflict (studio_id, user_id) do nothing;

insert into public.platform_admins (user_id)
select distinct ur.user_id from public.user_roles ur where ur.role = 'admin'
on conflict (user_id) do nothing;

-- ============ 5) NOT NULL + whatsapp_sessions primary key ============
alter table public.clients alter column studio_id set not null;
alter table public.bookings alter column studio_id set not null;
alter table public.session_logs alter column studio_id set not null;
alter table public.whatsapp_sessions alter column studio_id set not null;

alter table public.whatsapp_sessions drop constraint whatsapp_sessions_pkey;
alter table public.whatsapp_sessions add constraint whatsapp_sessions_pkey primary key (studio_id, phone);

create index if not exists clients_studio_id_idx on public.clients (studio_id);
create index if not exists bookings_studio_day_idx on public.bookings (studio_id, day);
create index if not exists session_logs_studio_id_idx on public.session_logs (studio_id);

-- ============ 6) RLS ============
alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
alter table public.platform_admins enable row level security;
alter table public.treatments enable row level security;

create policy "members can read their studio" on public.studios for select to authenticated
  using (public.is_studio_member(auth.uid(), id));
create policy "members can read own memberships" on public.studio_members for select to authenticated
  using (user_id = auth.uid() or public.is_studio_member(auth.uid(), studio_id));
create policy "platform admins readable by self" on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create policy "members can read treatments" on public.treatments for select to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));
create policy "members can insert treatments" on public.treatments for insert to authenticated
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "members can update treatments" on public.treatments for update to authenticated
  using (public.is_studio_member(auth.uid(), studio_id))
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "members can delete treatments" on public.treatments for delete to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));

-- replace has_role based policies with studio-scoped ones
drop policy if exists "admins can read clients" on public.clients;
drop policy if exists "admins can insert clients" on public.clients;
drop policy if exists "admins can update clients" on public.clients;
drop policy if exists "admins can delete clients" on public.clients;
create policy "studio members can read clients" on public.clients for select to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can insert clients" on public.clients for insert to authenticated
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can update clients" on public.clients for update to authenticated
  using (public.is_studio_member(auth.uid(), studio_id))
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can delete clients" on public.clients for delete to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));

drop policy if exists "admins can read bookings" on public.bookings;
drop policy if exists "admins can insert bookings" on public.bookings;
drop policy if exists "admins can update bookings" on public.bookings;
drop policy if exists "admins can delete bookings" on public.bookings;
create policy "studio members can read bookings" on public.bookings for select to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can insert bookings" on public.bookings for insert to authenticated
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can update bookings" on public.bookings for update to authenticated
  using (public.is_studio_member(auth.uid(), studio_id))
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can delete bookings" on public.bookings for delete to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));

drop policy if exists "admins can read session logs" on public.session_logs;
drop policy if exists "admins can insert session logs" on public.session_logs;
drop policy if exists "admins can update own session logs" on public.session_logs;
drop policy if exists "admins can delete session logs" on public.session_logs;
create policy "studio members can read session logs" on public.session_logs for select to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can insert session logs" on public.session_logs for insert to authenticated
  with check (public.is_studio_member(auth.uid(), studio_id) and author_id = auth.uid());
create policy "studio members can update session logs" on public.session_logs for update to authenticated
  using (public.is_studio_member(auth.uid(), studio_id))
  with check (public.is_studio_member(auth.uid(), studio_id));
create policy "studio members can delete session logs" on public.session_logs for delete to authenticated
  using (public.is_studio_member(auth.uid(), studio_id));

-- whatsapp_sessions: intentionally no policies (service-role only access)
alter table public.whatsapp_sessions enable row level security;