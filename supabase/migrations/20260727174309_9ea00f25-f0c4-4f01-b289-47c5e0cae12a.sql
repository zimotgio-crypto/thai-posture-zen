CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES public.studios(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'foto',
  title text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  storage_path text NOT NULL,
  width int,
  height int,
  source text NOT NULL DEFAULT 'upload',
  license_note text,
  consent_ok boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX media_assets_studio_idx ON public.media_assets (studio_id, created_at DESC);
CREATE INDEX media_assets_kind_idx ON public.media_assets (kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own studio and platform library"
  ON public.media_assets FOR SELECT TO authenticated
  USING (
    (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id))
    OR studio_id IS NULL
  );

CREATE POLICY "members insert own studio media"
  ON public.media_assets FOR INSERT TO authenticated
  WITH CHECK (
    (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id))
    OR (studio_id IS NULL AND public.is_platform_admin(auth.uid()))
  );

CREATE POLICY "members update own studio media"
  ON public.media_assets FOR UPDATE TO authenticated
  USING (
    (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id))
    OR (studio_id IS NULL AND public.is_platform_admin(auth.uid()))
  )
  WITH CHECK (
    (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id))
    OR (studio_id IS NULL AND public.is_platform_admin(auth.uid()))
  );

CREATE POLICY "members delete own studio media"
  ON public.media_assets FOR DELETE TO authenticated
  USING (
    (studio_id IS NOT NULL AND public.is_studio_member(auth.uid(), studio_id))
    OR (studio_id IS NULL AND public.is_platform_admin(auth.uid()))
  );

-- Storage: platform library folder access
CREATE POLICY "platform admins can upload platform media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'studio-media'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.is_platform_admin(auth.uid())
  );

CREATE POLICY "platform admins can update platform media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'studio-media'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'studio-media'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.is_platform_admin(auth.uid())
  );

CREATE POLICY "platform admins can delete platform media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'studio-media'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.is_platform_admin(auth.uid())
  );