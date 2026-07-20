
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60;

ALTER TABLE public.session_logs
  ADD COLUMN IF NOT EXISTS treatment_name text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;
