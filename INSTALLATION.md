# Dein Claude-Code-Team — Installation

Dieses Paket macht aus deiner Claude Code Installation ein eingespieltes Team:
fünf spezialisierte Agenten, vier Befehle für wiederkehrende Abläufe,
Berechtigungen, die dir das ständige Bestätigen ersparen, und einen echten
Browser zum Testen.

---

## Was drin ist

### Fünf Agenten (`.claude/agents/`)

**`tenant-guard`** — dein wichtigster Wächter. Alle Server-Funktionen in
deinem Projekt umgehen die Datenbank-Sicherheitsregeln, weil sie mit
Administratorrechten laufen. Die Trennung zwischen Studios hängt allein daran,
dass jede einzelne Abfrage von Hand nach Studio filtert. Vergisst jemand das
ein einziges Mal, sieht ein Studio die Kundendaten eines anderen. Dieser Agent
findet solche Stellen.

**`i18n-guard`** — prüft, ob deutsche und englische Texte vollständig sind und
findet Texte, die hart im Code stehen statt in den Sprachdateien.

**`migration-author`** — schreibt Datenbank-Änderungen. Nur additiv, immer mit
Studio-Zuordnung, immer mit Zugriffsregeln, immer mit einem Blick auf
Gesundheitsdaten.

**`booking-tester`** — bedient deine Buchungsstrecke in einem echten Browser,
auf Desktop und Handy, in beiden Sprachen, und berichtet dir, wo eine Kundin
abspringen würde.

**`security-auditor`** — sucht offengelegte Zugangsdaten, fehlende
Zugriffsregeln und Datenschutzprobleme.

Du kannst sie direkt ansprechen — etwa `@agent-tenant-guard prüf mal die
Änderungen von heute` — oder Claude entscheidet selbst, wann einer passt.

### Vier Befehle (`.claude/skills/`)

**`/check`** — die vollständige Prüfung vor dem Push. Lässt Code-Prüfung und
Build laufen und schickt anschliessend drei Agenten parallel über deine
Änderungen. Am Ende bekommst du ein klares Urteil.

**`/ship`** — der sichere Veröffentlichungsablauf. Prüft erst, schaut nach, ob
in Lovable zwischenzeitlich editiert wurde, committet und pusht. Und
verweigert kategorisch alles, was die Git-Historie umschreiben würde.

**`/new-route`** — legt eine neue öffentliche Seite vollständig an: Meta-Tags,
strukturierte Daten, beide Sprachen, Sitemap-Eintrag, Buchungsmöglichkeit.
Nichts vergessen.

**`/new-table`** — legt eine neue Datenbanktabelle an. Bespricht erst den
Entwurf mit dir, baut dann Migration, Zugriffsregeln, Typen und Zugriffe.

### Berechtigungen (`.claude/settings.json`)

Erlaubt sind alle üblichen Arbeitsschritte — bauen, prüfen, committen, pushen.
Du musst nicht mehr jeden Befehl einzeln bestätigen.

Ausdrücklich verboten sind alle Befehle, die deine Git-Historie umschreiben
könnten, sowie Änderungen an `AGENTS.md`, `bunfig.toml` und `.lovable/`. Auch
das Lesen der `.env` ist gesperrt, damit keine Zugangsdaten versehentlich in
einer Antwort landen.

### Browser-Anbindung (`.mcp.json`)

Playwright, damit Agenten deine Seite wirklich bedienen können statt nur den
Code zu lesen.

---

## Installation

Entpacke das Paket so, dass `.claude` und `.mcp.json` direkt im Projektordner
liegen — auf derselben Ebene wie `package.json` und deine `CLAUDE.md`.

So sollte es danach aussehen:

```
thai-posture-zen/
├── .claude/
│   ├── agents/          fünf .md-Dateien
│   ├── skills/          vier Ordner mit je einer SKILL.md
│   └── settings.json
├── .mcp.json
├── CLAUDE.md
├── package.json
└── src/
```

Prüfen in PowerShell:

```powershell
cd $env:USERPROFILE\Documents\thai-posture-zen
dir .claude\agents
dir .claude\skills
```

Es müssen fünf Agent-Dateien und vier Skill-Ordner erscheinen.

Falls Windows die Ordner beim Entpacken verschluckt hat — Ordner, die mit
einem Punkt beginnen, behandelt der Explorer manchmal eigenwillig — kannst du
sie auch von Hand anlegen und die Dateien hineinkopieren.

---

## Erster Start

Claude Code neu starten, damit es die neuen Dateien einliest:

```powershell
claude
```

Dann prüfen, ob alles erkannt wurde:

```
/help
```

In der Liste sollten `/check`, `/ship`, `/new-route` und `/new-table`
auftauchen.

Beim ersten Start fragt Claude Code, ob du dem Playwright-Server vertraust.
Das musst du einmal bestätigen, danach nie wieder.

**Ein erster Test**, der nichts verändert und dir zeigt, dass es funktioniert:

```
@agent-tenant-guard Prüf bitte src/lib/booking.functions.ts und
src/lib/admin.functions.ts auf Verstösse gegen die Mandantenfähigkeit.
```

Der Agent liest die Dateien und meldet dir, was er findet. Er ändert nichts.

---

## Wie du ab jetzt arbeitest

Für eine normale Änderung reicht:

```
[Auftrag aus dem Arbeitspaket einfügen]
```

Danach:

```
/check
```

Und wenn das Urteil positiv ist:

```
/ship fix: multi-day google calendar events now block all affected days
```

Bei allem, was die Datenbank oder die Buchungslogik anfasst, lohnt sich der
Planungsmodus: zweimal Shift+Tab drücken, dann den Auftrag einfügen. Claude
liest dann nur, ändert nichts und legt dir einen Plan vor. Du siehst also
vorher, was passieren soll, und kannst widersprechen, bevor etwas geschieht.

Und für grössere Aufgaben kannst du Claude ausdrücklich anweisen, mehrere
Agenten parallel arbeiten zu lassen:

```
Nutze mehrere parallele Agenten: einer prüft die Buchungslogik, einer die
Zugriffsregeln in den Migrationen, einer die englischen Übersetzungen.
```

---

## Optional: automatische Prüfung nach jeder Änderung

Claude Code kann nach jeder Dateiänderung selbstständig die Code-Prüfung
laufen lassen. Das ist praktisch, aber die genaue Schreibweise dafür hängt von
deiner Version ab, und ein falsch eingerichteter Automatismus ist ärgerlicher
als keiner.

Wenn du das willst, frag Claude Code direkt:

```
Richte mir einen PostToolUse-Hook in .claude/settings.json ein, der nach
jedem Edit oder Write auf eine .ts- oder .tsx-Datei eslint --fix auf genau
dieser Datei laufen lässt. Ich bin auf Windows mit Git for Windows
installiert. Prüfe die aktuelle Hook-Syntax in der Dokumentation, bevor du
etwas schreibst, und teste danach, ob es wirklich auslöst.
```

Es kennt seine eigene aktuelle Konfiguration am besten.

---

## graphify übernehmen

Der Wissensgraph aus deinem Trading-Projekt ist hier noch nicht vorhanden.
Such zuerst, wo er liegt:

```powershell
Get-ChildItem -Path $env:USERPROFILE -Recurse -Directory -Filter "graphify" -ErrorAction SilentlyContinue | Select-Object FullName
```

Wenn du den Ordner gefunden hast, kopierst du ihn herüber — den Pfad aus der
Ausgabe einsetzen:

```powershell
Copy-Item -Path "<gefundener Pfad>" -Destination "$env:USERPROFILE\Documents\thai-posture-zen\.claude\skills\graphify" -Recurse
```

Danach Claude Code neu starten und den Erstaufbau anstossen. Wichtig: Vorher
eine `.graphifyignore` anlegen, sonst wird der erste Durchlauf unnötig teuer.
In dein Projekt gehören hinein:

```
src/routeTree.gen.ts
src/integrations/supabase/types.ts
bun.lock
.lovable/
src/assets/
public/images/
test-results/
.output/
```

Diese Dateien werden entweder generiert oder ändern sich ständig, ohne dass
sie für den Graphen Wert hätten.

---

## Was ins Git gehört

Alles aus diesem Paket gehört committet — es ist Projektwissen, kein
persönlicher Kram. Falls du später eine `.claude/settings.local.json`
anlegst, gehört die dagegen in die `.gitignore`; dort landen persönliche
Einstellungen.

Ergänze deine `.gitignore` ausserdem um:

```
test-results/
.claude/settings.local.json
```
