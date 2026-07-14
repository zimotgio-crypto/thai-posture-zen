
-- Drop the anon-broad policies on clients (public form goes through a server fn instead).
drop policy if exists "anon can insert clients" on public.clients;
drop policy if exists "anon can update clients by email match (public upsert)" on public.clients;
revoke insert, update on public.clients from anon;

-- Drop the anon insert on bookings for the same reason.
drop policy if exists "anon can insert online bookings" on public.bookings;
revoke insert on public.bookings from anon;

-- Drop the public availability function; a server function using the service
-- role will return only day+time to visitors.
drop function if exists public.list_booking_slots(date);

-- Restrict SECURITY DEFINER helpers to server-side callers (they are invoked
-- inside RLS policies as the definer regardless of these grants).
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
grant execute on function public.has_role(uuid, public.app_role) to service_role;

revoke execute on function public.claim_admin() from anon, authenticated, public;
grant execute on function public.claim_admin() to service_role;
