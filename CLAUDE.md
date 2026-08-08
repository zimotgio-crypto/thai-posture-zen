# Thai Posture Lab — Massage-Studio: Homepage + Backend

Antworte mir auf **Deutsch**. Code, Bezeichner und Commit-Messages auf Englisch.

## Projektüberblick

Website und Verwaltungs-Backend für ein Thai-Massage-Studio, ursprünglich mit
Lovable erstellt und über GitHub mit dem Lovable-Projekt verknüpft.
Umfasst Kunden-Verwaltung, Kalender und Terminbuchung.

Pilot-Studio: **Thai Posture Lab**, Eschenstrasse 24, Zuzwil SG — `slug: tpl-zuzwil`
(Konstante `DEFAULT_STUDIO_SLUG` in `src/lib/studio.ts`).

Langfristiges Ziel: mandantenfähige Lösung, die weitere Studios in der Schweiz
als eigene Mandanten aufnimmt. Deshalb liegen die öffentlichen Seiten unter
`$studioSlug`-Routen und es gibt bereits `studios`, `studio_members` und
`platform_admins` in der Datenbank. **Neue Features immer mandantenfähig bauen —
keine Studio-Daten hart codieren.**

## Technische Basis (Bestandsaufnahme 06.08.2026 — verifiziert, nicht erneut ermitteln)

- **Framework:** TanStack Start (SSR) mit TanStack Router, file-based routing
- **Frontend:** React 19, TypeScript, Vite 8
- **Styling:** Tailwind CSS v4 (CSS-first, **kein** `tailwind.config.js`) + shadcn/ui
- **Backend:** **Supabase** (Auth, Postgres, Storage) — via Lovable Cloud bereitgestellt.
  Client in `src/integrations/supabase/`, Migrationen in `supabase/migrations/`
- **Server-State:** TanStack Query
- **Weitere Integrationen:** Google Calendar (`google-calendar.server.ts`),
  WhatsApp (`whatsapp.server.ts`), TipTap-Editor im Admin

Wichtig: Es gibt **keine `index.html`**. Meta-Tags und `<head>` laufen über die
`head:`-Option der Routen, Root-Shell in `src/routes/__root.tsx`.

### Befehle

```
npm run dev      # Dev-Server
npm run build    # Produktions-Build — muss vor jedem Push grün sein
npm run lint     # ESLint
npm run format   # Prettier
```

### Verzeichnisstruktur

```
src/routes/
  __root.tsx                   Root-Shell, globale Meta-Tags, Provider
  index.tsx                    Startseite (Default-Studio)
  $studioSlug/                 Mandanten-Routen: index, kontakt, home-office,
                               behandlung.$treatmentKey
  _authenticated/admin/        Admin (noindex): calendar, clients, marketing,
                               mediathek, studios, einstellungen
  sitemap[.]xml.ts             Dynamische Sitemap
src/lib/                       Domain-Logik.
                               *.server.ts   → nur serverseitig
                               *.functions.ts → Server-Functions
src/integrations/supabase/     Client + generierte types.ts
src/components/admin/          body-map, pain-trend-chart, assessment,
                               behandlungsprotokoll, media-library
supabase/migrations/           SQL-Migrationen, chronologisch benannt
```

### Datenbank (Stand 06.08.2026)

Tabellen: `studios`, `studio_members`, `platform_admins`, `clients`, `bookings`,
`session_logs`, `treatments`, `campaigns`, `media_assets`, `whatsapp_sessions`.
Views: `studios_public`, `treatments_public`.
Security-Definer-Funktionen: `is_platform_admin()`, `is_studio_member()`,
`redeem_campaign()`, `release_campaign()`.

## Kritischer Arbeitsablauf: GitHub ↔ Lovable

Das Lovable-Projekt ist mit diesem Repo verknüpft und zeigt Änderungen live an.
Der beobachtete Branch ist **`main`** (verifiziert: `origin/HEAD → origin/main`).

- Änderungen müssen **committed UND gepusht** werden. Ein Durchlauf, der nur
  lokal ändert, erscheint nicht auf Lovable — auch wenn der Code korrekt ist.
- **Niemals Git-History umschreiben:** kein `push --force`, kein Rebase, kein
  Amend oder Squash bereits gepushter Commits. Das zerstört die Projekt-History
  auf Lovable-Seite.
- Vor jedem Push: `npm run lint` **und** `npm run build`. Der verbundene Branch
  muss immer lauffähig sein.
- Bei grösseren Änderungen zuerst einen Feature-Branch, erst nach grünem Build
  nach `main` mergen.
- Nur noch Claude Code bearbeitet den Code — keine parallele manuelle Bearbeitung
  über die Lovable-Oberfläche. Falls doch einmal in Lovable editiert wurde:
  **vor** dem nächsten Durchlauf `git pull`, sonst gehen die Änderungen verloren.
- `.lovable/`, `AGENTS.md` und `bunfig.toml` nicht anfassen — die verwaltet Lovable.
- Bestehende Muster übernehmen (Komponentenstruktur, Benennung, Styling-Ansatz),
  keine abweichenden Konventionen einführen — sonst entsteht ein Stilbruch
  zwischen Lovable-generiertem und Claude-Code-geschriebenem Code.

## Domänenbegriffe

- **Kalender** — Verfügbarkeits- und Terminübersicht (`/admin/calendar`)
- **Kunden** — Kundendaten inkl. Historie (`clients`, `/admin/clients`)
- **Termine** — Buchungen, die Kunden mit Kalender-Slots verknüpfen (`bookings`)
- **Behandlung** — buchbare Leistung mit Preis und Dauer (`treatments`)
- **Massagetagebuch / Behandlungsprotokoll** — Sitzungsnotizen (`session_logs`)
- **Studio** — Mandant (`studios`)

Diese Begriffe konsistent in UI-Texten verwenden. Im Code die etablierten
englischen Bezeichner beibehalten, damit Frontend und Datenbank übereinstimmen.

## Design-System

Theme: Schwarz/Gold/Beige, ruhig und hochwertig. Alle Farben in **oklch**.
Semantische Tokens aus `src/styles.css` verwenden, nie Hex-Werte hart schreiben:

- `--ivory` / `--ivory-deep` — warme beige Hintergründe
- `--charcoal` / `--charcoal-soft` — Text, dunkle Flächen
- `--gold` / `--gold-deep` / `--gold-soft` — Akzente
- Utilities: `gold-rule`, `btn-gold`, `--gradient-gold`, `--shadow-gold`

Neue Farbe: Variable in `:root` **und** `.dark` definieren, dann in
`@theme inline` als `--color-<name>: var(--<name>)` registrieren.

Schriften: Cormorant Garamond (Headlines), Inter (Fliesstext),
Noto Sans Thai (thailändische Begriffe).

## Sprachen

`src/lib/i18n.tsx` (öffentlich) und `src/lib/admin-i18n.tsx` (Admin),
Deutsch und Englisch. Neue sichtbare Texte **immer** in beide Sprachdateien
eintragen, nie hart im JSX.

## Supabase und Datenschutz

- Migrationen nur **additiv** anlegen, nie bestehende Dateien ändern.
- Jede neue Tabelle mit Kundendaten braucht **Row Level Security** plus Policy.
- Massagetagebuch, Schmerzskala und Behandlungsprotokolle sind besonders
  schützenswerte Gesundheitsdaten (revDSG). Kunden dürfen ausschliesslich
  ihre eigenen Datensätze lesen und schreiben.
- Zugriffsprüfungen über die vorhandenen Security-Definer-Funktionen
  (`is_studio_member`, `is_platform_admin`), nicht neu erfinden.
- Nach Schema-Änderungen `src/integrations/supabase/types.ts` neu generieren.
- In `.env` gehören nur die öffentlichen Client-Werte. Niemals ein
  `service_role`-Key oder Datenbank-Passwort — die Datei ist im Repo eingecheckt.

## SEO

- Jede öffentliche Route braucht in `head:`: `title`, `description`,
  `og:title`, `og:description`, `og:url`, `og:image` und `canonical`.
- Admin- und Auth-Routen: `{ name: "robots", content: "noindex, nofollow" }`.
- Strukturierte Daten (JSON-LD) **serverseitig** in die Route rendern,
  nicht per `useEffect` — sonst sehen Crawler sie nicht.
- Neue öffentliche Route heisst auch: Eintrag in `sitemap[.]xml.ts`.
- Keine Umbenennung bestehender Routen ohne Redirect — das kostet Rankings.

## graphify (Wissensgraph)

Dieses Projekt nutzt einen Wissensgraphen unter `graphify-out/`
(God-Nodes, Community-Struktur, dateiübergreifende Beziehungen).

**Status 08.08.2026: eingerichtet.** `graphify-out/` wird lokal erzeugt und
ist per `.gitignore` vom Repo ausgeschlossen. Fehlt es lokal, einmaligen
Erstaufbau über die globale graphify-Skill ausführen.

Regeln:

- Existiert `graphify-out/graph.json` noch nicht, ist ein einmaliger Erstaufbau
  nötig (voller Projekt-Scan), bevor Abfragen möglich sind.
- Für Codebase-Fragen zuerst `graphify query "<Frage>"`. Für Beziehungen
  `graphify path "<A>" "<B>"`, für einzelne Konzepte `graphify explain "<Konzept>"`
  — das liefert einen fokussierten Teilgraphen statt eines vollständigen
  Grep- oder Datei-Ergebnisses.
- Existiert `graphify-out/wiki/index.md`, dieses zur groben Navigation nutzen
  statt Rohcode zu durchsuchen.
- `graphify-out/GRAPH_REPORT.md` nur für einen breiten Architektur-Überblick
  lesen, oder wenn `query`/`path`/`explain` nicht genug Kontext liefern.
- Nach jeder Code-Änderung `graphify update .` laufen lassen.
- **Auf häufig wechselnde Nicht-Code-Dateien achten:** Werden neben Code auch
  Dokumentations-, Bild- oder PDF-Dateien geändert, verlässt `graphify update .`
  den kostenlosen `code_only`-Schnellpfad und löst teurere semantische
  Extraktion aus. Kandidaten in diesem Projekt: `.lovable/plan.md`,
  `bun.lock`, `src/routeTree.gen.ts` (generiert), `src/assets/*`,
  `public/images/*`, `src/integrations/supabase/types.ts` (generiert).
  Sobald sie auffallen, per `.graphifyignore` (gitignore-Syntax) ausschliessen.

## Bekannte Baustellen

Bekannte offene Punkte siehe `00/bekannte-baustellen.md` (nicht im Repo).

## Was ich nicht will

- Keine `any`-Types.
- Keine Inline-Styles, wo ein Token existiert.
- Keine neuen Abhängigkeiten ohne Rückfrage.
- Keine Studio-spezifischen Werte hart codiert — alles über die Mandanten-Daten.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
