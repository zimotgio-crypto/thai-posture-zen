
CREATE TABLE public.whatsapp_sessions (
  phone TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_whatsapp_sessions_touch BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
