create policy "studio media public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'studio-media');

create policy "studio members can upload studio media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'studio-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_studio_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

create policy "studio members can update studio media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'studio-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_studio_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'studio-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_studio_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

create policy "studio members can delete studio media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'studio-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_studio_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);