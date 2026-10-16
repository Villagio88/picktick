# Änderungen

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach
[Semantic Versioning](https://semver.org/lang/de/).

## [1.0.0] (erste öffentliche Fassung)

### Neu
- Rollen PICTS und TICTS je Eintrag, mit Vorschlag aus den gewählten Leistungen.
- Karte «Rollen» im Dashboard: Stunden je Rolle, Anteil PICTS, Verlauf je Monat.
- Einstellungen in der App: Absender und Bank für Rechnungen, eigene Leistungsliste mit Rolle.
- Monatliche Pauschale je Arbeitgeber statt fester Vorgabe.
- Anmeldung mit Passwort, optional API-Schlüssel für Skripte und ein Schlüssel nur zum Erfassen; «Abmelden» beendet alle Sitzungen.
- Rechnungen bleiben offen, bis die Zahlung erfasst ist; vor dem Erstellen fragt PickTick nach.
- Gesamtsicherung aller Daten als eine Datei, Endpunkt `/api/gesund` für Monitoring.
- Willkommensschritte beim ersten Start.
- Docker-Image ohne root, mit Healthcheck; Beispiel mit Caddy für HTTPS.

### Gegenüber der internen Vorfassung behoben
- Datum zwischen Mitternacht und 01:00/02:00 wurde als Vortag gespeichert (UTC statt Schweizer Zeit).
- Rechnungen zweier Auftraggeber mit gleicher Nummer beeinflussten gegenseitig den Zahlungsstatus.
- Beschädigte Datendateien konnten still durch leere Daten ersetzt werden.
- «Neuer Eintrag» liess das Datum leer.
- CSV-Export liess sich nicht vollständig wieder importieren.
- Bearbeiten konnte eine manuell erfasste Dauer still aus den Uhrzeiten neu berechnen.
- Neue Einträge auf dem Computer übernehmen den in der Seitenleiste gewählten Arbeitgeber.
