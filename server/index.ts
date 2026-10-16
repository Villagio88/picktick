import { app, SERVE_FRONTEND } from './app.js';
import { anmeldungNoetig } from './auth.js';
import { runMigrations } from './migrations.js';
import { seedIfNeeded } from './seed.js';
import { createDailyBackup } from './store.js';

const PORT = Number(process.env.PORT) || 3001;
const OHNE_ANMELDUNG_ERLAUBT = process.env.PICKTICK_OHNE_ANMELDUNG === '1';

// --- Startup: seed, migrate, backup ---
seedIfNeeded();
// Sicherung vor den Migrationen, damit ein Update immer einen Rückweg hat
createDailyBackup();
runMigrations();

// --- Daily backup interval (every 6 hours) ---
setInterval(() => {
  try { createDailyBackup(); } catch (err) { console.error('[backup] Interval failed:', err); }
}, 6 * 60 * 60 * 1000);

// Ohne Passwort nur lokal lauschen, ausser es ist bewusst anders gewollt
let HOST = process.env.HOST || '0.0.0.0';
if (!anmeldungNoetig && !OHNE_ANMELDUNG_ERLAUBT) {
  if (process.env.HOST && !['127.0.0.1', 'localhost', '::1'].includes(process.env.HOST)) {
    console.error('[auth] Ohne PICKTICK_PASSWORT ist ein Start im Netz nicht erlaubt. Passwort setzen oder PICKTICK_OHNE_ANMELDUNG=1 (nur im geschützten Netz).');
    process.exit(1);
  }
  HOST = '127.0.0.1';
  console.warn('[auth] PICKTICK_PASSWORT ist nicht gesetzt: PickTick ist nur auf diesem Rechner erreichbar (127.0.0.1).');
} else if (!anmeldungNoetig) {
  console.warn('[auth] Ohne Anmeldung im Netz (PICKTICK_OHNE_ANMELDUNG=1). Nur im geschützten eigenen Netz so betreiben.');
}

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}${SERVE_FRONTEND ? ' (with frontend)' : ' (API only)'}`);
});
