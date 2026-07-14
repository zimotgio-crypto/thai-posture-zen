# Admin Dashboard Plan

A private `/admin` area (hidden from nav) that lets the therapist see every online booking on a Treatwell-style calendar, add manual bookings, browse clients, and keep a per-client "Massagetagebuch" of session notes.

## 1. Backend: enable Lovable Cloud

The current booking modal only writes to `localStorage`, which is per-device. For a real admin dashboard the therapist needs to see bookings made from any visitor's browser and store treatment notes durably. I'll enable Lovable Cloud (managed database + auth) and:

- Move the public booking submit from `localStorage` to a `bookings` table.
- Store manual bookings and treatment notes in the same database.
- Derive the client directory from a `clients` table with UNIQUE email.

Tables (all `public`, with proper GRANTs + RLS):

```text
clients      id, name, phone, email (unique), street, zip, city, created_at
bookings     id, client_id, treatment, day (date), time (text), silent, source
             ('online' | 'manual' | 'block'), notes, created_at
session_logs id, client_id, booking_id (nullable), body (text), created_at
```

RLS: only the `admin` role (via `user_roles` + `has_role()`) can select/insert/update; anonymous public inserts allowed on `bookings` + upsert on `clients` for the booking form.

## 2. Auth (secure, single admin)

- Email/password auth via Lovable Cloud, one admin account.
- New `user_roles` table + `has_role()` security-definer function per platform rules.
- Login page at `/admin/login`; `/admin/*` sits under a `_authenticated` layout that redirects to `/admin/login` when the visitor isn't signed in or isn't in the `admin` role. No public link to `/admin` — hidden route, not in nav or footer.
- Standard sign-out button in the admin shell.

## 3. Admin UI

Warm ivory/sand aesthetic reused from the site (serif headings, gold accents, minimalist chrome).

Routes:

- `/admin/login` — email + password.
- `/admin` — redirects to today's calendar.
- `/admin/calendar` — daily + weekly Treatwell-style calendar.
- `/admin/clients` — client directory.
- `/admin/clients/$id` — client profile + Massagetagebuch.

Shared admin layout: left rail with Kalender, Kunden; top bar with date jumper and "Termin hinzufügen".

### Calendar view

- Toggle: `Tag` / `Woche`.
- Time axis 09:00–20:00 in 30-min rows.
- Bookings render as gold cards spanning the 90-min block (60 treatment + 30 buffer), with client name, treatment and phone.
- Click a card → side sheet with full booking details, quick "Notiz hinzufügen" jump into that client's Massagetagebuch.
- "Termin hinzufügen" opens a modal with: Client (autocomplete existing or "new"), Name, Phone, Email, Address (Strasse, PLZ, Ort), Date, Time, Treatment, plus a "Zeit blockieren" checkbox that creates a `block` entry with no client.

### Clients tab

- Sortable list: name, city, phone, last visit, total sessions.
- Search by name / email / phone.
- Row click → client profile.

### Client profile + Massagetagebuch

- Header: name, address, contact.
- Timeline of past + upcoming bookings.
- Chronological session-log feed (newest first): date, treatment, note body.
- Simple rich-text field (Tiptap with bold/italic/list/heading only) + "Speichern" to append a new entry, optionally linked to a specific past booking via a dropdown.

## 4. Public booking form changes

- On submit, POST to a server function that upserts the client by email (name/phone/address updated) and inserts the booking. Removes the current `localStorage` persistence; the 90-min block logic keeps working by querying the DB for that day's bookings.
- No visible change for visitors.

## Technical notes

- Data fetching: TanStack Query, loaders use `context.queryClient.ensureQueryData` and components read via `useSuspenseQuery`.
- Server functions in `src/lib/admin.functions.ts`, all wrapped in `requireSupabaseAuth` middleware + a `has_role(userId, 'admin')` check.
- Rich-text editor: `@tiptap/react` + `@tiptap/starter-kit`.
- Calendar: hand-built CSS grid (no heavy calendar lib) to keep the warm, minimalist look.
- The `/admin` route tree is excluded from the sitemap and gets `robots: noindex` in its `head()`.

## Setup you'll do after I build it

1. Approve enabling Lovable Cloud when I trigger it.
2. Sign up once at `/admin/login` with the email you want as admin — I'll then grant that user the `admin` role via a one-off SQL migration you can trigger, or I'll add a one-time "claim admin" server function that only works while no admin exists yet.

Ready to proceed on this shape? If you'd rather keep everything client-side (localStorage only, single-device, no real auth), say so and I'll strip the plan down.
