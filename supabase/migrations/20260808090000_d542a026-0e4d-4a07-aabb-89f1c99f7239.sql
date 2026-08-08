-- Prevent double bookings at the database level.
--
-- Why: the availability check in the app (booking-availability.server.ts /
-- booking.functions.ts) and the subsequent insert are two separate steps.
-- Two concurrent requests for the same slot can both pass the check and both
-- insert (TOCTOU race). This EXCLUDE constraint makes Postgres reject the
-- second insert atomically. The studio-specific buffer_minutes stays app
-- logic; the constraint only guards against hard overlaps.
--
-- On violation Postgres raises SQLSTATE 23P01 (exclusion_violation); the app
-- must catch that code and show a "slot already taken" message.

-- btree_gist provides gist opclasses for uuid/date so they can be combined
-- with the int4range overlap check in one gist constraint.
-- Supabase convention: extensions live in the "extensions" schema.
create extension if not exists btree_gist with schema extensions;

-- "time" is stored as text 'HH:MM' (zero-padded, app-validated via zod
-- ^\d{2}:\d{2}$). Index expressions require an immutable function; empty
-- search_path + fully qualified names, no security definer needed.
create or replace function public.booking_start_minutes(t text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.split_part(t, ':', 1)::integer * 60
       + pg_catalog.split_part(t, ':', 2)::integer;
$$;

-- No execute grants needed: the constraint's index evaluates the function
-- internally with table-owner rights, not as the calling role. Default
-- EXECUTE for public is harmless (immutable, no data access).

-- Legacy-data check (run manually before/after deploy if in doubt):
-- overlapping rows on or after the cutoff date would make this migration fail.
--
--   select a.id, b.id, a.studio_id, a.day, a."time", a.duration_minutes,
--          b."time", b.duration_minutes
--   from public.bookings a
--   join public.bookings b
--     on a.studio_id = b.studio_id
--    and a.day = b.day
--    and a.id < b.id
--    and int4range(public.booking_start_minutes(a."time"),
--                  public.booking_start_minutes(a."time") + a.duration_minutes)
--     && int4range(public.booking_start_minutes(b."time"),
--                  public.booking_start_minutes(b."time") + b.duration_minutes)
--   where a.day >= date '2026-08-08';
--
-- Cutoff date 2026-08-08 (deploy date): EXCLUDE does not support NOT VALID,
-- so historical overlaps (e.g. an old manual block overlapping a booking)
-- must not be touched or deleted. The partial WHERE clause applies the
-- constraint only to rows from the cutoff onwards; new inserts are always
-- covered. If the query above returns rows, resolve them manually first.

-- int4range is half-open [start, end), so back-to-back bookings
-- (e.g. 10:00-11:00 and 11:00-...) do not conflict. All sources
-- ('online', 'manual', 'block') participate: a block also excludes bookings.
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
