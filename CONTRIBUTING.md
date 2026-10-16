# Mitmachen

Danke, dass du PickTick besser machen willst.

## Bevor du loslegst

- Für grössere Änderungen zuerst ein Issue eröffnen und kurz beschreiben, was du vorhast.
- Kleine Korrekturen (Tippfehler, klare Fehler) gerne direkt als Pull Request.

## Entwickeln

```bash
npm ci
npm run dev        # Server und Oberfläche mit Neuladen, Daten im Ordner daten/
```

Vor dem Pull Request:

```bash
npm run typecheck
npx eslint .
npm test
npm run build
```

## Regeln

- Oberfläche und Texte auf Deutsch (Schweizer Schreibweise: ss statt ß).
- Keine echten Zeiteinträge, Namen oder Zugangsdaten in Code, Tests, Issues oder
  Screenshots. Für Beispiele erfundene, klar als Demo erkennbare Daten verwenden.
- Bestehende Daten müssen nach einem Update weiter funktionieren. Änderungen am
  Datenformat kommen als neue Migration in `server/migrations.ts`, nie durch Ändern einer
  bestehenden.
- Neue Logik mit Tests (`src/utils/__tests__/`).

## Lizenz

Mit einem Beitrag stellst du ihn unter die AGPL-3.0, wie das ganze Projekt.
