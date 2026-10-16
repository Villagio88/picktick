# PickTick

**Time tracking for school ICT support staff (PICTS and TICTS).** Self-hosted, your data stays with you.

[![Prüfen](https://github.com/Villagio88/picktick/actions/workflows/pruefen.yml/badge.svg)](https://github.com/Villagio88/picktick/actions/workflows/pruefen.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

[Deutsche Fassung](README.md)

> The app itself is in German, as it was built for Swiss schools. Contributions for other
> languages are welcome.

## The idea

I am the ICT coordinator at a public school in Switzerland. My workload is defined in
lessons, but the work doesn't come in lessons: an iPad that won't start before the first
lesson on Monday, a printer that stops working after an update, a teacher who needs help
right before a parents' evening. In between: preparing staff training, writing concepts,
evaluating software.

At the end of a school year I wanted to answer three questions:

1. **Did I meet my target hours?** And where do I stand today, in the middle of the year?
2. **Where did the time go?** Which topics eat hours, what could be automated or handed off?
3. **How much of it was technical, how much pedagogical?** In Swiss school terms: TICTS or PICTS.

Many schools in German-speaking Switzerland split ICT support into two roles:

- **TICTS**, technical ICT support: first-level support, devices, accounts, network,
  licences, maintaining the infrastructure.
- **PICTS**, pedagogical ICT support: teacher training, classroom coaching, media
  education, concepts and the development of digital learning.

In practice the same people often do both, and the technical work is always urgent. The
canton of Schwyz noted this in a 2022 evaluation of ICT resources: some school boards
report that technical problem solving often absorbs the PICTS resources meant for
pedagogical work, and the time records were overall too unreliable a basis to derive the
actual resource needs
([Erziehungsratsbeschluss Nr. 59, Kanton Schwyz, in German](https://www.sz.ch/public/upload/assets/64162/59_Evaluation_ICT_Ressourcen.pdf?fp=1)).

That is where PickTick comes in: a simple, consistent way of tracking time that assigns
every activity to a role. It makes visible whether the pedagogical work gets lost in daily
firefighting, so conversations with school leadership can rest on numbers instead of gut
feeling.

Common time trackers are built for companies: projects, clients, hourly rates. They know
nothing about a school year starting in August, a workload in lessons, or roles. I didn't
find a tool for this, so I built PickTick for myself, and because other PICTS and TICTS
face the same questions, I'm sharing it.

## Features

- **Fast entry**: description, time from and to or just the duration, services as
  selectable chips. A dedicated, lightweight mobile view.
- **PICTS and TICTS roles**: every entry has a role. PickTick suggests it from the selected
  services (printer means TICTS, staff training means PICTS); confirm or change it with one
  click.
- **Role distribution**: hours per role by month and school year, plus the PICTS share.
- **Target hours across the school year**: yearly target from workload percentage or
  lessons, progress in percent, monthly status, workload history per school year.
  Optional monthly flat-rate hours.
- **Multiple clients**: besides the school, side jobs with hourly rates, invoices or hour
  reports as PDF, invoice numbers and payment status.
- **Reports and archive**: report per school year, calendar view, search, filter by
  service, CSV export and import.
- **Backups**: daily backup in the data folder and a full backup download.
- **Login**: password for the web interface, optional API key for scripts.

**What PickTick is not (yet)**: a multi-user system with permissions, connected to
Microsoft 365 or Google (SSO), or a solution reviewed by a canton. One instance belongs to
one person.

## Quick start with Docker

```bash
git clone https://github.com/Villagio88/picktick.git
cd picktick
cp .env.example .env        # set a password, at least 12 characters
docker compose up -d --build
```

PickTick then runs on `http://localhost:3001`, reachable from this machine only. Data is
stored as plain JSON files in the Docker volume `picktick-daten`.

To reach it from outside, never expose it without HTTPS. The easiest way is the bundled
Caddy setup, which obtains a certificate automatically (a domain must point to the server):

```bash
PICKTICK_DOMAIN=time.example.org \
  docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d --build
```

Alternatively, run it inside a private network such as Tailscale. All environment
variables are listed in the [German README](README.md#einstellungen-über-umgebungsvariablen).

## Running it at a school

Descriptions quickly contain names of teachers, parents or children. That is personal data,
and the school or its governing body is responsible for it, not the individual who enters
it. Agree on the setup with your school leadership, describe activities without pupils'
names, keep the server in Switzerland or with your municipality, and decide how long entries
are kept. For reports to school leadership, hours, services and roles are enough; the
descriptions stay with you. PickTick has not been reviewed by any canton or school.

## Backups

Daily backups are stored in the data folder, on the same disk. Keep a second copy
elsewhere: download a full backup under Einstellungen › Sicherung, or archive the Docker
volume. Restore steps are in the [German README](README.md#sichern-und-wiederherstellen).

## Roadmap

- **Dictation**: create an entry by voice, first through an iPhone shortcut that
  recognises speech on the device and sends only text. Date, times and duration are parsed
  without AI; service and role are suggested; nothing is saved without confirmation.
- **Report for school leadership** as PDF, without descriptions.
- **Target hours per role**, for schools that resource PICTS and TICTS separately.
- **Calendar import** from ICS.
- **Multiple users** per instance, with Microsoft 365 or Google sign-in.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) (both in German;
issues in English are welcome).

## License

Copyright (C) 2026 Andrin Villa

PickTick is licensed under the **GNU Affero General Public License v3.0** (see
[LICENSE](LICENSE)). You may use, modify and share it, including at your school or
municipality, as long as the copyright notice and license are kept, and anyone who
distributes a modified version or runs it as a service for others publishes their source
code under the same license.
