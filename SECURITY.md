# Sicherheit

## Lücke melden

Bitte melde Sicherheitslücken **nicht** als öffentliches Issue, sondern vertraulich über
[GitHub Security Advisories](https://github.com/Villagio88/picktick/security/advisories/new).
Ich melde mich so bald wie möglich.

## Unterstützte Fassungen

Sicherheitskorrekturen gibt es für die jeweils neueste Fassung.

## Was PickTick absichert

- Anmeldung mit Passwort (mindestens 12 Zeichen), Sitzung als signiertes Cookie
  (`HttpOnly`, `SameSite=Strict`, bei HTTPS `Secure`), 14 Tage gültig. «Abmelden» beendet
  alle Sitzungen, ein Passwortwechsel ebenfalls.
- Bremse gegen das Durchprobieren von Passwörtern (10 Fehlversuche je Adresse in 15 Minuten).
- Schreibende Anfragen aus fremden Seiten werden abgewiesen (Origin-Prüfung), dazu
  Content-Security-Policy und weitere Sicherheitsheader.
- Ohne Passwort startet PickTick nur lokal auf `127.0.0.1`; im Docker-Image verweigert es den Start.
- Ein eigener Schlüssel nur zum Erfassen, damit ein verlorenes Handy keine Daten ändern oder löschen kann.
- Das Docker-Image läuft nicht als root.
- Beschädigte Datendateien werden nie still durch leere Daten ersetzt.

## Was du selbst absichern musst

- HTTPS über einen Reverse Proxy (Beispiel `docker-compose.caddy.yml`), oder Betrieb nur
  in einem privaten Netz.
- Sicherungen an einem zweiten Ort (Einstellungen › Gesamtsicherung).
- Zugriff auf den Server und auf den Datenordner.
