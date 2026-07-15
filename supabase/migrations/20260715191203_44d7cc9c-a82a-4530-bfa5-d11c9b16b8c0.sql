CREATE UNIQUE INDEX IF NOT EXISTS clients_unique_name_ci_idx
ON public.clients (lower(btrim(first_name)), lower(btrim(last_name)));