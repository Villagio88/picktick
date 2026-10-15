# PickTick

**Time tracking for school ICT support staff (PICTS and TICTS).** Self-hosted, your data stays with you.

[Deutsche Fassung](README.md)

> The app itself is in German, as it was built for Swiss schools. Contributions for other
> languages are welcome.

## The idea

I am the ICT coordinator at a public school in Switzerland. My workload is defined in
lessons, but the work doesn't come in lessons: an iPad that won't start on Monday at
7:40, a printer that stops working after an update, a teacher who needs help sharing a
form right before a parents' evening. In between: preparing staff training, writing
concepts, evaluating software.

At the end of a school year I wanted to answer three questions:

1. **Did I meet my target hours?** And where do I stand today, in the middle of the year?
2. **Where did the time go?** Which topics eat hours, what could be automated or handed off?
3. **How much of it was technical, how much pedagogical?** In Swiss school terms: TICTS or PICTS.

The third question matters most, and no time tracker answers it. Many schools in
German-speaking Switzerland split ICT support into two roles:

- **TICTS**, technical ICT support: first-level support, devices, accounts, network,
  licences, maintaining the infrastructure.
- **PICTS**, pedagogical ICT support: teacher training, classroom coaching, media
  education, concepts and the strategic development of digital learning.

In practice the same people often do both. And because the technical work is always
urgent, it quietly crowds out the pedagogical work. Tracking your time by role makes this
visible, so you can discuss it with your school leadership based on numbers instead of
gut feeling.

I couldn't find a tool for this. Common time trackers are built for companies: projects,
clients, hourly rates. They know nothing about a school year starting in August, a
workload in lessons, or roles. So I built PickTick for myself, and because other PICTS and
TICTS face the same questions, I'm sharing it.

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
- **Login**: password for the web interface, optional API key for scripts.

## Quick start with Docker

```bash
git clone https://github.com/Villagio88/picktick.git
cd picktick
cp .env.example .env        # set a password
docker compose up -d --build
```

PickTick then runs on `http://localhost:3001`. Data is stored as plain JSON files in the
`daten/` folder next to `docker-compose.yml`, with a daily backup.

For access from outside your network, put PickTick behind a reverse proxy with HTTPS
(for example Caddy) or into a private network such as Tailscale. Behind a proxy, set
`PICKTICK_HINTER_PROXY=1`.

## Privacy

PickTick runs on your own server, a NAS or a small VPS. No cloud, no vendor account, no
telemetry. Time entries quickly contain names of teachers or children, which is exactly
why they don't belong in someone else's service.

## Roadmap

- **Dictation**: create an entry by voice, first through an iPhone shortcut that
  recognises speech on the device and sends only text. Date, times and duration are parsed
  without AI; service and role are suggested; nothing is saved without confirmation.
- **Monthly report for school leadership** as PDF.
- **Target hours per role**, for schools that budget PICTS and TICTS separately.
- **Calendar import** from ICS.
- **Cases** that span several days, with status and total effort.
- **Multiple users** per instance.

## License

Copyright (C) 2026 Andrin Villa

PickTick is licensed under the **GNU Affero General Public License v3.0** (see
[LICENSE](LICENSE)). You may use, modify and share it, including at your school or
municipality, as long as the copyright notice and license are kept, and anyone who
distributes a modified version or runs it as a service for others publishes their source
code under the same license.
