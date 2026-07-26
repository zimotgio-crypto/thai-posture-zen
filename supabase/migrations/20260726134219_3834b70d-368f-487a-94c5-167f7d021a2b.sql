create or replace view public.studios_public as
select
  s.id, s.slug, s.name, s.street, s.zip, s.city, s.country, s.phone, s.email,
  s.timezone, s.buffer_minutes, s.slot_step_minutes, s.opening_hours,
  s.tagline, s.hero_heading, s.hero_text, s.about_heading, s.about_text,
  s.features, s.payment_methods, s.parking_note, s.maps_url,
  s.logo_path, s.hero_image_path, s.room_image_path, s.portrait_image_path
from public.studios s
where s.active = true;

create or replace view public.treatments_public as
select t.id, t.studio_id, t.key, t.label, t.description, t.sort_order, t.options
from public.treatments t
join public.studios s on s.id = t.studio_id
where t.active = true and s.active = true;

grant select on public.studios_public to anon, authenticated;
grant select on public.treatments_public to anon, authenticated;