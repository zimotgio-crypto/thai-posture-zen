ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.studios SET testimonials = '[
  {"quote":"Endlich ein Studio, das versteht, was Nackenverspannungen vom ständigen Sitzen bedeuten. Die Griffe sind unglaublich präzise.","author":"M. B., Zuzwil"},
  {"quote":"Das Silent Treatment ist genial. Keine erzwungenen Gespräche, einfach nur tiefe Erholung und professionelle Arbeit.","author":"S. K., Wil"},
  {"quote":"Dank des Massagetagebuchs wusste der Therapeut beim zweiten Mal sofort, wo meine Schwachstellen liegen. Extrem effizient!","author":"T. R., Uzwil"}
]'::jsonb
WHERE slug = 'tpl-zuzwil' AND testimonials = '[]'::jsonb;

UPDATE public.studios SET faqs = '[
  {"question":"Muss ich mich vorbereiten?","answer":"Nein. Komm bequem gekleidet — wir stellen alles Nötige zur Verfügung. Bitte 5 Minuten vor Termin da sein."},
  {"question":"Was ist das Silent Treatment?","answer":"Auf Wunsch verzichten wir vollständig auf Smalltalk. Ideal, wenn du wirklich abschalten willst — einfach beim Buchen aktivieren."},
  {"question":"Wie kann ich bezahlen?","answer":"Wir akzeptieren TWINT, alle gängigen Karten sowie Bargeld. Die Quittung erhältst du digital per Mail."},
  {"question":"Kann ich kurzfristig absagen?","answer":"Kostenlose Absagen sind bis zu 24 Stunden vor dem Termin möglich. Da wir ein kleines Studio sind und die Slots exklusiv für dich reservieren, behalten wir uns bei kurzfristigeren Absagen oder Nichterscheinen vor, eine Umtriebsentschädigung von 50% des Behandlungspreises per Post- oder Mail-Rechnung zu stellen. Vielen Dank für dein Verständnis und dein Fairplay!"},
  {"question":"Gibt es Parkplätze?","answer":"Ja, direkt vor dem Studio an der Eschenstrasse 24. Kostenlos für unsere Gäste."}
]'::jsonb
WHERE slug = 'tpl-zuzwil' AND faqs = '[]'::jsonb;