---
name: ship
description: Sicherer Push-Ablauf für das mit Lovable verbundene Repository. Committet und pusht erst nach vollständiger Prüfung, ohne jemals die Historie umzuschreiben.
argument-hint: "[Commit-Beschreibung auf Englisch]"
allowed-tools: Bash, Read, Glob, Grep, Agent
---

# Änderungen veröffentlichen

Commit-Beschreibung: $ARGUMENTS

## Aktueller Stand

Zweig: !`git rev-parse --abbrev-ref HEAD`

Status:
!`git status --short`

Unterschied zum letzten Stand:
!`git diff HEAD --stat`

## Ablauf

### 1. Prüfen

Führe zuerst die vollständige Prüfung aus dem Skill `check` durch. Wenn
etwas nicht besteht, brich hier ab und melde es mir. Push nur bei grünem
Ergebnis.

### 2. Auf Fremdänderungen prüfen

```
git fetch origin
git status
```

Wenn der entfernte Zweig weiter ist als der lokale, wurde in der
Lovable-Oberfläche editiert. Dann **erst** `git pull`, Konflikte klären,
erneut bauen — und mir Bescheid geben, was sich geändert hat.

### 3. Committen

Commit-Beschreibung auf Englisch, im Muster `fix:`, `feat:`, `chore:` oder
`docs:`. Falls ich keine Beschreibung mitgegeben habe, formuliere selbst eine
aus den Änderungen und zeig sie mir vor dem Committen.

### 4. Pushen

Auf den aktuellen Zweig pushen.

## Absolute Grenzen

Diese Befehle führst du **niemals** aus, egal wie sinnvoll sie erscheinen:

- `git push --force` in jeder Form
- `git rebase` auf bereits gepushten Commits
- `git commit --amend` auf bereits gepushten Commits
- `git reset --hard` auf gepushten Stand
- Interaktives Squashen gepushter Commits

Der Grund: Dieses Repository ist mit Lovable verbunden. Umgeschriebene
Historie zerstört dort die Projekt-Historie, und das lässt sich nicht
rückgängig machen.

Wenn dir ein Problem begegnet, das nur durch Umschreiben der Historie lösbar
scheint: **hör auf und frag mich**. Ein hässlicher Zusatz-Commit ist immer
besser als eine zerstörte Historie.

## Danach

Sag mir in einem Satz, was gepusht wurde und dass die Änderung nun in Lovable
sichtbar sein sollte. Wenn ich auf einem Feature-Zweig war, erinnere mich
daran, dass die Änderung erst nach dem Zusammenführen mit `main` auf der
Live-Seite erscheint.
