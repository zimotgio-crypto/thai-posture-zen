ALTER TABLE public.clients ADD COLUMN first_name text, ADD COLUMN last_name text;

UPDATE public.clients
SET
  first_name = COALESCE(NULLIF(split_part(name, ' ', 1), ''), name, ''),
  last_name  = COALESCE(NULLIF(trim(substring(name from position(' ' in name || ' ') + 1)), ''), '');

ALTER TABLE public.clients
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE public.clients DROP COLUMN name;

CREATE INDEX IF NOT EXISTS clients_first_name_idx ON public.clients (first_name);
CREATE INDEX IF NOT EXISTS clients_last_name_idx  ON public.clients (last_name);