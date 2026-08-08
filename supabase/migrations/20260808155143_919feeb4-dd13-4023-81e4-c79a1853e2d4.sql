create extension if not exists btree_gist with schema extensions;

create or replace function public.booking_start_minutes(t text)
returns integer language sql immutable set search_path = ''
as $$
  select pg_catalog.split_part(t, ':', 1)::integer * 60
       + pg_catalog.split_part(t, ':', 2)::integer;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_no_overlap_excl'
  ) then
    alter table public.bookings
      add constraint bookings_no_overlap_excl
      exclude using gist (
        studio_id with =,
        day with =,
        int4range(
          public.booking_start_minutes("time"),
          public.booking_start_minutes("time") + duration_minutes
        ) with &&
      )
      where (day >= date '2026-08-08');
  end if;
end $$;

alter view public.studios_public set (security_invoker = on);
alter view public.treatments_public set (security_invoker = on);