alter table public.studios
  add column if not exists tagline text,
  add column if not exists hero_heading text,
  add column if not exists hero_text text,
  add column if not exists about_heading text,
  add column if not exists about_text text,
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists payment_methods jsonb not null default '[]'::jsonb,
  add column if not exists parking_note text,
  add column if not exists maps_url text,
  add column if not exists logo_path text,
  add column if not exists hero_image_path text,
  add column if not exists room_image_path text,
  add column if not exists portrait_image_path text;

update public.studios set
  tagline = 'Zuzwil · Eschenstrasse 24',
  hero_heading = 'Die Symbiose aus traditioneller Thai-Heilkunst & modernem Haltungs-Reset.',
  hero_text = 'Willkommen im Thai Posture Lab an der Eschenstrasse 24 in Zuzwil. Gezielte Tiefenentspannung für Vielsitzer, Sportler und Genießer. Parkplätze direkt vor der Tür.',
  about_heading = 'Digital reibungslos. Analog spürbar.',
  about_text = 'Wir haben das Studio so konzipiert, wie wir selbst behandelt werden möchten: still, warm, uneitel. Kein Papierkram, keine unnötigen Gespräche — nur du, dein Körper und präzise Hände.',
  features = '[
    {"title":"Silent Treatment","text":"Optional stille Behandlung."},
    {"title":"Digitale Quittung","text":"Direkt per Mail nach Termin."},
    {"title":"TWINT & Karte & Bar","text":"Kontaktlos zahlen, ohne Wartezeit, aber auch Bar möglich"},
    {"title":"Parkplätze vor Ort","text":"Kostenlos an der Eschenstrasse."}
  ]'::jsonb,
  payment_methods = '["TWINT","Karte","Bar"]'::jsonb,
  parking_note = 'Ja, direkt vor dem Studio an der Eschenstrasse 24. Kostenlos für unsere Gäste.',
  maps_url = 'https://www.google.com/maps/search/?api=1&query=Eschenstrasse+24+9524+Zuzwil'
where slug = 'tpl-zuzwil';