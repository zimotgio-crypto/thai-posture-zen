---
name: check
description: Vollständige Prüfung vor dem Push — Code-Prüfung, Build, Mandantenfähigkeit, Zweisprachigkeit und Sicherheit. Vor jedem Push nach main ausführen.
allowed-tools: Bash, Read, Glob, Grep, Agent
---

# Prüfung vor dem Push

## Aktueller Stand

Zweig: !`git rev-parse --abbrev-ref HEAD`

Geänderte Dateien:
!`git status --short`

Änderungen im Überblick:
!`git diff HEAD --stat`

## Deine Aufgabe

Führe alle Prüfungen durch, bevor dieser Stand auf den mit Lovable
verbundenen Zweig gelangt. Der Zweig `main` ist die Live-Seite — was dort
kaputt ist, ist sofort für Kunden kaputt.

### Schritt 1: Technische Prüfung

Führe nacheinander aus und melde jeden Fehler im Wortlaut:

```
npm run lint
npm run build
```

Beides muss fehlerfrei durchlaufen. Wenn nicht, hör hier auf und melde mir
den Fehler — die weiteren Prüfungen sind dann sinnlos.

### Schritt 2: Fachliche Prüfung durch Unteragenten

Starte diese drei Agenten **parallel**, jeweils nur auf die geänderten
Dateien bezogen:

- `tenant-guard` — prüft die Mandantentrennung
- `i18n-guard` — prüft die Zweisprachigkeit
- `security-auditor` — prüft Zugangsdaten und Zugriffsregeln

### Schritt 3: Eigene Durchsicht

Prüfe zusätzlich selbst:

- Keine `any`-Typen hinzugekommen
- Keine Inline-Styles, wo ein Token aus `src/styles.css` existiert
- Keine neuen Abhängigkeiten ohne meine ausdrückliche Zustimmung
- Keine bestehende Migration verändert (nur neue angelegt)
- `.lovable/`, `AGENTS.md` und `bunfig.toml` unangetastet
- Bei neuen öffentlichen Routen: Meta-Tags gesetzt und Eintrag in
  `src/routes/sitemap[.]xml.ts` ergänzt

### Schritt 4: Urteil

Fasse auf Deutsch zusammen und gib eine klare Empfehlung: **bereit zum
Push** oder **noch nicht**, mit Begründung.

Sei dabei ehrlich. Ein „sieht gut aus", das einen Fehler durchwinkt, kostet
mich echte Kunden.
