# PickTick

**Zeiterfassung für PICTS und TICTS an Schulen.** Selbst gehostet, deine Daten bleiben bei dir.

[![Prüfen](https://github.com/Villagio88/picktick/actions/workflows/pruefen.yml/badge.svg)](https://github.com/Villagio88/picktick/actions/workflows/pruefen.yml)
[![Lizenz: AGPL-3.0](https://img.shields.io/badge/Lizenz-AGPL--3.0-blue.svg)](LICENSE)

[English version](README.en.md)

## Die Idee dahinter

Ich bin ICT-Verantwortlicher an einer Volksschule in der Schweiz. Mein Pensum ist in
Lektionen festgelegt, gearbeitet wird aber nicht in Lektionen: ein iPad, das am Montag vor
der ersten Stunde nicht startet, ein Drucker, der nach einem Update streikt, eine
Lehrperson, die kurz vor dem Elternabend Hilfe braucht. Dazwischen Weiterbildungen
vorbereiten, Konzepte schreiben, Software evaluieren.

Am Ende eines Schuljahres wollte ich drei Fragen beantworten können:

1. **Habe ich mein Soll erfüllt?** Und wie stehe ich heute, mitten im Schuljahr?
2. **Wofür ging die Zeit drauf?** Welche Themen fressen Stunden, was liesse sich
   automatisieren oder abgeben?
3. **Wie viel davon war technisch, wie viel pädagogisch?** Also TICTS oder PICTS.

Viele Schulen in der Deutschschweiz trennen die beiden Rollen:

- **TICTS**, technischer ICT-Support: First-Level-Support, Geräte, Konten, Netzwerk,
  Lizenzen, Unterhalt der Infrastruktur.
- **PICTS**, pädagogischer ICT-Support: Weiterbildung der Lehrpersonen, Beratung im
  Unterricht, Medienbildung, Konzepte und die Entwicklung der Digitalisierung.

In der Praxis machen oft dieselben Personen beides, und das Technische drängt. Der Kanton
Schwyz hat das 2022 in einer Auswertung der ICT-Ressourcen festgehalten: Einige
Schulträger machen die Erfahrung, dass «technische Problemlösungen häufig die Ressourcen
der PICTS für ihre pädagogischen Aufgaben absorbieren». Und die Arbeitszeiterfassungen
der Schulträger bildeten insgesamt «eine zu unsichere Grundlage, um daraus den effektiven
Ressourcenbedarf ableiten zu können»
([Erziehungsratsbeschluss Nr. 59, Kanton Schwyz, 12. Dezember 2022](https://www.sz.ch/public/upload/assets/64162/59_Evaluation_ICT_Ressourcen.pdf?fp=1)).

Genau hier setzt PickTick an: eine einfache, einheitliche Erfassung, die jede Tätigkeit
einer Rolle zuordnet. So wird sichtbar, ob die pädagogische Arbeit im Alltag untergeht, und
das Gespräch mit der Schulleitung stützt sich auf Zahlen statt auf ein Bauchgefühl.

Die gängigen Zeiterfassungen sind für Firmen gebaut: Projekte, Kunden, Stundensätze. Sie
kennen kein Schuljahr, das im August beginnt, kein Pensum in Lektionen und keine Rollen.
Ein passendes Werkzeug habe ich nicht gefunden, also habe ich mir PickTick gebaut. Weil
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
- **Sicherung**: tägliche Sicherung im Datenordner und eine Gesamtsicherung zum
  Herunterladen.
- **Anmeldung**: Passwort für die Oberfläche, optional ein API-Schlüssel für Skripte.

<!-- Screenshots folgen, mit Demodaten -->

**Was PickTick bewusst (noch) nicht ist**: ein System für mehrere Personen mit Rechten, ein
Anschluss an Microsoft 365 oder Google (SSO) oder eine von einem Kanton geprüfte Lösung.
Eine Instanz gehört einer Person.

## Schnellstart mit Docker

```bash
git clone https://github.com/Villagio88/picktick.git
cd picktick
cp .env.example .env        # Passwort eintragen, mindestens 12 Zeichen
docker compose up -d --build
```

Danach läuft PickTick auf `http://localhost:3001`, nur von diesem Rechner aus erreichbar.
Die Daten liegen im Docker-Volume `picktick-daten` als einfache JSON-Dateien.

Erste Schritte in der App:

1. Unter **Arbeitgeber** die Schule anlegen, «Sollzeit» aktivieren, Vollzeitstunden und
   Pensum oder Lektionen eintragen.
2. Unter **Einstellungen** die Leistungen an deine Schule anpassen und festlegen, welche
   Leistung welche Rolle nahelegt. Absender und Bank nur, wenn du Rechnungen schreibst.
3. Loslegen mit **Neuer Eintrag**.

### Von unterwegs erreichbar, mit HTTPS

PickTick gehört nie ohne HTTPS ins Internet. Am einfachsten mit dem beigelegten Caddy, der
das Zertifikat selbst besorgt. Voraussetzung ist eine Domain, die auf den Server zeigt:

```bash
PICKTICK_DOMAIN=zeit.meine-domain.ch \
  docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
```

Alternativ in einem privaten Netz wie Tailscale betreiben.

### Einstellungen über Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `PICKTICK_PASSWORT` | Passwort für die Anmeldung, mindestens 12 Zeichen. Ohne Passwort lauscht PickTick nur auf `127.0.0.1`. |
| `PICKTICK_API_SCHLUESSEL` | Optional. Schlüssel für Skripte, als `Authorization: Bearer <schlüssel>`. |
| `PICKTICK_HINTER_PROXY` | `1`, wenn ein Reverse Proxy mit HTTPS davor steht. |
| `PICKTICK_DATEN` | Datenordner (im Image `/app/daten`). |
| `PICKTICK_OHNE_ANMELDUNG` | `1` erlaubt den Betrieb ohne Passwort im Netz. Nur in einem geschützten Netz. |
| `PORT`, `HOST` | Port und Adresse des Servers, Vorgabe 3001 und 0.0.0.0. |

### Ohne Docker

Node.js 22 oder neuer:

```bash
npm ci
npm run build
PICKTICK_PASSWORT=... npm start
```

Für die Entwicklung: `npm run dev` startet Server und Oberfläche mit Neuladen.

## Betrieb an einer Schule

PickTick speichert Arbeitszeiten und Beschreibungen. In Beschreibungen stehen schnell Namen
von Lehrpersonen, Eltern oder Kindern. Das sind Personendaten, und für Personendaten einer
Schule ist die Schule beziehungsweise der Schulträger verantwortlich, nicht die einzelne
Person, die sie erfasst. Deshalb:

- **Absprechen**: Den Betrieb mit der Schulleitung oder dem Schulträger klären, besonders
  wenn PickTick auf einem privaten Server läuft.
- **Sparsam erfassen**: Tätigkeiten ohne Namen von Schülerinnen und Schülern beschreiben
  («iPad einer Schülerin der 5. Klasse zurückgesetzt» statt des Namens).
- **Ort der Daten**: Server in der Schweiz oder bei der Gemeinde; bei einem gemieteten
  Server gehört ein Vertrag zur Auftragsbearbeitung dazu.
- **Aufbewahren und löschen**: Festlegen, wie lange Einträge aufbewahrt werden.
- **Weitergeben**: Für Auswertungen an die Schulleitung reichen Stunden, Leistungen und
  Rollen; die Beschreibungen bleiben bei dir.

PickTick ist kein von einem Kanton oder einer Schule geprüftes System. Die Hinweise oben
ersetzen keine Abklärung mit der zuständigen Stelle für Datenschutz.

## Sichern und Wiederherstellen

PickTick legt täglich eine Sicherung im Datenordner an. Die liegt aber auf demselben
Datenträger. Eine zweite Kopie an einem anderen Ort ist Pflicht:

- **In der App**: Einstellungen › Sicherung › Gesamtsicherung herunterladen. Eine Datei mit
  allen Daten.
- **Auf dem Server**, als Archiv des ganzen Volumes:

```bash
docker run --rm -v picktick_picktick-daten:/daten -v "$PWD":/ziel \
  node:24-bookworm-slim tar czf /ziel/picktick-daten.tgz -C /daten .
```

Wiederherstellen aus einer Gesamtsicherung:

```bash
node scripts/sicherung-entpacken.mjs picktick-sicherung.json ./wiederherstellung
docker compose stop
docker run --rm -v picktick_picktick-daten:/daten -v "$PWD/wiederherstellung":/quelle \
  node:24-bookworm-slim sh -c "cp -a /quelle/. /daten/ && chown -R node:node /daten"
docker compose start
```

Der Volume-Name setzt sich aus dem Ordnernamen und `picktick-daten` zusammen; `docker volume ls`
zeigt ihn an. Vor einem Update sichert PickTick die Daten automatisch, bevor es Migrationen
ausführt.

## Für Skripte: die API

Mit einem API-Schlüssel lassen sich Einträge von aussen anlegen, etwa aus einem Kurzbefehl
oder einem Skript:

```bash
curl -X POST https://zeit.meine-domain.ch/api/entries \
  -H "Authorization: Bearer $PICKTICK_API_SCHLUESSEL" \
  -H "Content-Type: application/json" \
  -d '{"id":"<uuid>","beschreibung":"Drucker eingerichtet","fuerWen":"Schule",
       "kategorie":"technischer Support","leistung":"Drucker","datum":"2026-10-16",
       "startZeit":"07:30","endZeit":"08:00","dauerMinuten":30,
       "abgerechnet":false,"rechnungsnummer":""}'
```

`kategorie` ist die Rolle: `technischer Support` (TICTS), `pädagogischer Support` (PICTS)
oder `beides`. `GET /api/gesund` meldet ohne Anmeldung, ob die Daten lesbar sind.

## Was noch kommt

- **Diktat**: einen Eintrag per Sprache erfassen. Zuerst über einen Kurzbefehl auf dem
  iPhone, der die Sprache auf dem Gerät erkennt und nur Text an PickTick schickt. Datum,
  Zeiten und Dauer liest PickTick ohne KI aus dem Satz, Leistung und Rolle schlägt es vor,
  gespeichert wird erst nach deiner Bestätigung. Später ein Mikrofonknopf in der App und
  auf Wunsch eine lokale Spracherkennung auf dem eigenen Server.
- **Bericht für die Schulleitung** als PDF, mit Rollenverteilung und Stand zum Soll, ohne
  Beschreibungen.
- **Soll je Rolle**, für Schulen, die PICTS und TICTS getrennt ressourcieren.
- **Kalender-Import**: Sitzungen aus einem ICS-Kalender als Einträge übernehmen.
- **Mehrere Personen** in einer Instanz, mit Anmeldung über Microsoft 365 oder Google.

Ideen und Wünsche gerne als [Issue](https://github.com/Villagio88/picktick/issues).
Besonders interessiert mich, wie PICTS und TICTS an anderen Schulen und in anderen Kantonen
ressourciert und nachgewiesen werden.

## Mitmachen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md). Sicherheitslücken bitte vertraulich melden, siehe
[SECURITY.md](SECURITY.md). Änderungen je Fassung stehen im [CHANGELOG.md](CHANGELOG.md).

## Lizenz

Copyright (C) 2026 Andrin Villa

PickTick steht unter der **GNU Affero General Public License v3.0** (siehe
[LICENSE](LICENSE)). Du darfst PickTick nutzen, verändern und weitergeben, auch in deiner
Schule oder Gemeinde. Bedingungen: Der Copyright-Hinweis und die Lizenz bleiben erhalten,
und wer eine veränderte Fassung weitergibt oder als Dienst für andere betreibt, legt
seinen Quellcode unter derselben Lizenz offen. Den Link zum Quellcode zeigt PickTick
unten in der Seitenleiste; wer eine eigene Fassung betreibt, passt ihn in
`src/data/projekt.ts` an.
