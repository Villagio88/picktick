import { Router } from 'express';
import { readJSON, writeJSON } from '../store.js';

const router = Router();

router.post('/generate-nummer', (req, res) => {
  try {
    const { employer } = req.body as { employer: unknown };
    if (typeof employer !== 'string' || employer.trim().length === 0) {
      res.status(400).json({ error: 'employer must be a non-empty string' });
      return;
    }
    if (employer.length > 200) {
      res.status(400).json({ error: 'employer name too long' });
      return;
    }

    const year = new Date().getFullYear();
    const key = `${employer}|${year}`;

    const counters = readJSON<Record<string, number>>('invoice-counters.json', {});
    const next = (counters[key] || 0) + 1;
    counters[key] = next;
    writeJSON('invoice-counters.json', counters);

    const nummer = `${year}-${String(next).padStart(3, '0')}`;
    res.json({ nummer });
  } catch (err) {
    console.error('[invoice] POST /generate-nummer failed:', err);
    res.status(500).json({ error: 'Failed to generate invoice number' });
  }
});

export default router;
