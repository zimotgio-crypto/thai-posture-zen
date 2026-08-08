---
name: new-route
description: Legt eine neue öffentliche Seite vollständig an, mit Meta-Tags, strukturierten Daten, beiden Sprachen und Sitemap-Eintrag. Nutzen, wenn eine neue Seite für Kunden entstehen soll.
argument-hint: "[Pfad und Zweck der neuen Seite]"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

# Neue öffentliche Seite anlegen

Auftrag: $ARGUMENTS

## Vorher lesen

Sieh dir `src/routes/$studioSlug/kontakt.tsx` als Vorlage an — die Datei
zeigt das etablierte Muster für Meta-Tags, Canonical-Link und
Studio-Kontext. Übernimm dieses Muster, führe keine eigenen Konventionen ein.

## Checkliste — alle Punkte sind Pflicht

**Route und Struktur**

Die Datei gehört unter `src/routes/$studioSlug/`, damit sie für alle Studios
funktioniert. Eine Seite direkt unter `src/routes/` ist nur richtig, wenn sie
studio-unabhängig ist — das ist selten und muss begründet werden.

Alle Inhalte kommen aus den Studio-Daten. Keine Adresse, kein Studioname,
keine Telefonnummer hart im Code.

**Meta-Tags im `head:`**

Erforderlich sind `title`, `description`, `og:title`, `og:description`,
`og:url`, `og:image` und ein Canonical-Link. Titel und Beschreibung müssen
aus den Studio-Daten kommen, nicht fest verdrahtet sein.

**Strukturierte Daten**

Wenn die Seite eine Leistung, einen Ort oder häufige Fragen zeigt, gehört
passendes JSON-LD dazu — serverseitig über die `head:`-Option gerendert,
niemals per `useEffect` nachgeladen. Sonst sehen weder Google noch
AI-Suchmaschinen es.

**Beide Sprachen**

Jeder sichtbare Text gehört nach `src/lib/i18n.tsx`, in den `de`- **und** den
`en`-Block. Kein deutscher Text im JSX.

**Sitemap**

Trage die neue Seite in `src/routes/sitemap[.]xml.ts` ein, mit sinnvoller
Änderungshäufigkeit und Priorität. Vergessene Sitemap-Einträge sind der
häufigste Grund, warum neue Seiten nicht gefunden werden.

**Navigation**

Prüfe, ob die Seite in `src/components/site-header.tsx` oder
`src/components/site-footer.tsx` verlinkt werden soll. Eine Seite ohne
Verlinkung findet niemand.

**Gestaltung**

Verwende `src/components/section.tsx` für den Aufbau und die semantischen
Tokens aus `src/styles.css` — `--ivory`, `--charcoal`, `--gold` und die
Hilfsklassen `gold-rule` und `btn-gold`. Keine Hex-Werte, keine
Inline-Styles.

**Buchungsmöglichkeit**

Jede öffentliche Seite braucht einen Weg zur Buchung. Der Kopfbereich hat
zwar einen festen Buchen-Knopf, aber ein zusätzlicher Aufruf im Inhalt
gehört dazu, wo es passt.

## Zum Schluss

Führe `npm run lint` und `npm run build` aus. Berichte mir auf Deutsch, was
du angelegt hast und welche Punkte der Checkliste du erfüllt hast — und
nenne ausdrücklich, falls du einen bewusst ausgelassen hast.
