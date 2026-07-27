CREATE TABLE public.campaigns (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  treatment_id uuid references public.treatments(id) on delete set null,
  duration_minutes int,
  goal text not null default 'neukunden',
  code text not null,
  discount_type text not null default 'prozent',
  discount_value numeric not null,
  max_redemptions int,
  redemptions_used int not null default 0,
  valid_from date not null,
  valid_to date not null,
  channels text[] not null default '{}',
  radius_km int,
  age_min int,
  age_max int,
  budget_chf numeric,
  applies_to text not null default 'alle',
  status text not null default 'entwurf',
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX campaigns_studio_code_uniq ON public.campaigns (studio_id, upper(code));
CREATE INDEX campaigns_studio_idx ON public.campaigns (studio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio members can read campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (public.is_studio_member(auth.uid(), studio_id));
CREATE POLICY "studio members can insert campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (public.is_studio_member(auth.uid(), studio_id));
CREATE POLICY "studio members can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (public.is_studio_member(auth.uid(), studio_id))
  WITH CHECK (public.is_studio_member(auth.uid(), studio_id));
CREATE POLICY "studio members can delete campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (public.is_studio_member(auth.uid(), studio_id));

ALTER TABLE public.bookings
  ADD COLUMN campaign_id uuid references public.campaigns(id) on delete set null,
  ADD COLUMN discount_chf numeric;

CREATE OR REPLACE FUNCTION public.redeem_campaign(_campaign_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.campaigns
     SET redemptions_used = redemptions_used + 1
   WHERE id = _campaign_id
     AND (max_redemptions IS NULL OR redemptions_used < max_redemptions)
  RETURNING redemptions_used;
$$;

CREATE OR REPLACE FUNCTION public.release_campaign(_campaign_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.campaigns
     SET redemptions_used = greatest(redemptions_used - 1, 0)
   WHERE id = _campaign_id
  RETURNING redemptions_used;
$$;

REVOKE ALL ON FUNCTION public.redeem_campaign(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_campaign(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_campaign(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_campaign(uuid) TO service_role;