ALTER TABLE public.session_logs
  ADD COLUMN IF NOT EXISTS pain_level smallint,
  ADD COLUMN IF NOT EXISTS mobility jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tension jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.session_logs
  DROP CONSTRAINT IF EXISTS session_logs_pain_level_check;

ALTER TABLE public.session_logs
  ADD CONSTRAINT session_logs_pain_level_check
  CHECK (pain_level IS NULL OR (pain_level BETWEEN 1 AND 10));