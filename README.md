# PickTick

**Zeiterfassung für PICTS und TICTS an Schulen.** Selbst gehostet, deine Daten bleiben bei dir.

[English version](README.en.md)

## Die Idee dahinter

Ich bin ICT-Verantwortlicher an einer Volksschule in der Schweiz. Mein Pensum ist in
Lektionen festgelegt, gearbeitet wird aber nicht in Lektionen: ein iPad, das am Montag um
7.40 Uhr nicht startet, ein Drucker, der nach einem Update streikt, eine Lehrperson, die
kurz vor dem Elternabend Hilfe beim Teilen eines Formulars braucht. Dazwischen
Weiterbildungen vorbereiten, Konzepte schreiben, Software evaluieren.

Am Ende eines Schuljahres wollte ich drei Fragen beantworten können:

1. **Habe ich mein Soll erfüllt?** Und wie stehe ich heute, mitten im Schuljahr?
2. **Wofür ging die Zeit drauf?** Welche Themen fressen Stunden, was liesse sich
   automatisieren oder abgeben?
3. **Wie viel davon war technisch, wie viel pädagogisch?** Also TICTS oder PICTS.

Die dritte Frage ist die wichtigste und die, die keine Zeiterfassung beantwortet. Viele
Schulen trennen die beiden Rollen:

- **TICTS**, technischer ICT-Support: First-Level-Support, Geräte, Konten, Netzwerk,
  Lizenzen, Unterhalt der Infrastruktur.
- **PICTS**, pädagogischer ICT-Support: Weiterbildung der Lehrpersonen, Beratung im
  Unterricht, Medienbildung, Konzepte und die strategische Entwicklung der Digitalisierung.

In der Praxis machen oft dieselben Personen beides. Und weil das Technische drängt, frisst
es das Pädagogische, ohne dass es jemand merkt. Wer die eigene Zeit nach Rollen erfasst,
sieht das schwarz auf weiss und kann es mit der Schulleitung besprechen: mit Zahlen statt
mit einem Bauchgefühl.

Eine passende Lösung habe ich nicht gefunden. Die gängigen Zeiterfassungen sind für Firmen
gebaut: Projekte, Kunden, Stundensätze. Sie kennen kein Schuljahr, das im August beginnt,
kein Pensum in Lektionen und keine Rollen. Also habe ich mir PickTick gebaut, und weil
andere PICTS und TICTS vor denselben Fragen stehen, teile ich es.

## Was PickTick kann

- **Erfassen in Sekunden**: Beschreibung, Zeit von bis oder direkt die Dauer, Leistungen
  als Auswahl. Auf dem Handy mit eigener, schlanker Ansicht.
- **Rollen PICTS und TICTS**: Jeder Eintrag trägt eine Rolle. PickTick schlägt sie aus den
  gewählten Leistungen vor (Drucker ergibt TICTS, Weiterbildung ergibt PICTS), du
  bestätigst oder änderst mit einem Klick.
- **Rollenverteilung**: Stunden je Rolle pro Monat und Schuljahr, dazu der Anteil PICTS.
- **Soll und Pensum im Schuljahr**: Jahressoll aus Pensum oder Lektionen, Fortschritt in
  Prozent, Stand pro Monat, Pensum je Schuljahr als Verlauf. Optional eine monatliche
  Pauschale, etwa für Erreichbarkeit und Kleinstanfragen.
- **Mehrere Auftraggeber**: Neben der Schule auch Nebenaufträge mit Stundenlohn, mit
  Rechnung oder Stundenübersicht als PDF, Rechnungsnummern und Zahlungsstatus.
- **Auswertung und Archiv**: Bericht pro Schuljahr, Kalenderansicht, Suche, Filter nach
  Leistung, Export und Import als CSV.
- **Anmeldung**: Passwort für die Oberfläche, optional ein API-Schlüssel für Skripte.

<!-- Screenshots folgen, mit Demodaten -->

## Schnellstart mit Docker

```bash
git clone https://github.com/Villagio88/picktick.git
cd picktick
cp .env.example .env        # Passwort eintragen
docker compose up -d --build
```

Danach läuft PickTick auf `http://localhost:3001`. Die Daten liegen im Ordner `daten/`
neben der `docker-compose.yml`, als einfache JSON-Dateien. PickTick legt dort zusätzlich
täglich eine Sicherung an.

Erste Schritte in der App:

1. Unter **Arbeitgeber** die Schule anlegen, «Sollzeit» aktivieren, Vollzeitstunden und
   Pensum oder Lektionen eintragen.
2. Unter **Einstellungen** die Leistungen an deine Schule anpassen und festlegen, welche
   Leistung welche Rolle nahelegt. Absender und Bank nur, wenn du Rechnungen schreibst.
3. Loslegen mit **Neuer Eintrag**.

Für den Zugriff von unterwegs gehört PickTick hinter einen Reverse Proxy mit HTTPS (zum
Beispiel Caddy) oder in ein privates Netz wie Tailscale. Hinter einem Proxy
`PICKTICK_HINTER_PROXY=1` setzen.

### Von einer älteren Fassung aktualisieren

Bestehende Daten bleiben beim Update unverändert. Neu sind die Einstellungen: Absender und
Bank für Rechnungen sowie die Leistungsliste mit Rollen. Nach dem Update einmal unter
«Einstellungen» nachtragen, sonst sind Rechnungen ohne Absender, und eigene Leistungen
haben noch keinen Rollenvorschlag. Eine monatliche Pauschale wird neu beim Arbeitgeber
eingetragen.

### Ohne Docker

```bash
npm ci
npm run build
PICKTICK_PASSWORT=... npx tsx server/index.ts
```

Für die Entwicklung: `npm run dev` startet Server und Oberfläche mit Neuladen.

## Datenschutz

PickTick läuft auf deinem eigenen Server, auf einem NAS oder einem kleinen VPS. Es gibt
keine Cloud, kein Konto bei einem Anbieter und keine Telemetrie. In Zeiteinträgen stehen
schnell Namen von Lehrpersonen oder Kindern; genau deshalb gehören sie nicht zu einem
fremden Dienst. Ein Tipp aus der Praxis: Für Auswertungen, die du weitergibst, reichen
Stunden, Leistungen und Rollen; die Beschreibungen mit Namen bleiben bei dir.

## Was noch kommt

- **Diktat**: einen Eintrag per Sprache erfassen. Zuerst über einen Kurzbefehl auf dem
  iPhone («Zeit erfassen»), der den Text auf dem Gerät erkennt und nur Text an PickTick
  schickt. Datum, Zeiten und Dauer liest PickTick ohne KI aus dem Satz, Leistung und
  Rolle schlägt es vor, gespeichert wird erst nach deiner Bestätigung. Später ein
  Mikrofonknopf in der App und auf Wunsch eine lokale Spracherkennung auf dem eigenen
  Server.
- **Monatsbericht für die Schulleitung** als PDF, mit Rollenverteilung und Stand zum Soll.
- **Soll je Rolle**, für Schulen, die PICTS und TICTS getrennt budgetieren.
- **Kalender-Import**: Sitzungen aus einem ICS-Kalender als Einträge übernehmen.
- **Vorgänge**: einen Fall über mehrere Tage verfolgen, mit Status und Gesamtaufwand.
- **Mehrere Personen** in einer Instanz, für Schulen mit getrenntem PICTS und TICTS.

Ideen und Wünsche gerne als Issue.

## Mitmachen

Fehlermeldungen, Ideen und Pull Requests sind willkommen. Vor einem grösseren Umbau am
besten kurz ein Issue eröffnen. Vor dem Einreichen bitte `npm test` und `npm run build`
laufen lassen.

## Lizenz

Copyright (C) 2026 Andrin Villa

PickTick steht unter der **GNU Affero General Public License v3.0** (siehe
[LICENSE](LICENSE)). Du darfst PickTick nutzen, verändern und weitergeben, auch in deiner
Schule oder Gemeinde. Bedingungen: Der Copyright-Hinweis und die Lizenz bleiben erhalten,
und wer eine veränderte Fassung weitergibt oder als Dienst für andere betreibt, legt
seinen Quellcode unter derselben Lizenz offen.
