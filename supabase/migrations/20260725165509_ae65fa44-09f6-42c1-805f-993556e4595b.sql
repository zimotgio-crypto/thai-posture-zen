CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  phone text PRIMARY KEY,
  state text NOT NULL DEFAULT 'idle',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.whatsapp_sessions TO service_role;

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (which bypasses RLS) accesses this table
-- from the WhatsApp webhook handler. No client or authenticated user should
-- read or write it.
