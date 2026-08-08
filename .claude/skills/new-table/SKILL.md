---
name: new-table
description: Legt eine neue Datenbanktabelle vollständig an — Migration, Zugriffsregeln, Typen und Server-Functions. Nutzen, wenn neue Daten gespeichert werden sollen.
argument-hint: "[Was soll gespeichert werden]"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
---

# Neue Tabelle anlegen

Auftrag: $ARGUMENTS

## Bestehende Migrationen

!`ls -1 supabase/migrations/ | tail -5`

## Ablauf

### 1. Entwurf besprechen, bevor du schreibst

Bevor du eine Zeile SQL schreibst, leg mir auf Deutsch vor:

- Welche Spalten mit welchen Typen, und warum
- Ob es Gesundheitsdaten sind (dann gilt revDSG, besondere Sorgfalt)
- Wer lesen und schreiben darf: nur Studio-Mitglieder, oder künftig auch
  Kunden selbst
- Ob eine bestehende Tabelle erweitert werden könnte, statt eine neue
  anzulegen

Warte meine Antwort ab. Datenmodelle sind später teuer zu ändern.

### 2. Migration schreiben

Nutze dafür den Agenten `migration-author`. Der kennt die Regeln dieses
Projekts — additiv, mit `studio_id`, mit RLS, mit den vorhandenen
Prüffunktionen.

### 3. Typen erneuern

Nach der Migration muss `src/integrations/supabase/types.ts` neu generiert
werden. Erkläre mir den Befehl dazu, falls ich ihn selbst ausführen muss.

### 4. Server-Functions

Neue Zugriffe gehören nach `src/lib/` als `*.functions.ts`. Dabei zwingend:

- `resolveStudioContext()` aufrufen, bevor Daten fliessen
- Jede Query mit `.eq("studio_id", studioId)` filtern
- Beim Einfügen `studio_id` setzen
- Eingaben mit Zod validieren, so wie es die bestehenden Funktionen tun
- Keine `any`-Typen

### 5. Prüfen lassen

Lass zum Schluss `tenant-guard` und `security-auditor` über deine Änderungen
laufen. Beide müssen sauber durchgehen.

### 6. Bauen

`npm run lint` und `npm run build`.

## Erinnerung

Massagetagebuch, Schmerzskala und Behandlungsprotokolle sind besonders
schützenswerte Gesundheitsdaten. Wenn deine neue Tabelle in diese Kategorie
fällt, sag es mir ausdrücklich — dann prüfen wir die Zugriffsregeln
gemeinsam, bevor irgendetwas live geht.
