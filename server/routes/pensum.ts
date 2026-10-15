import { Router } from 'express';
import { readJSON, writeJSON } from '../store.js';

interface PensumConfig {
  [schuljahrLabel: string]: number;
}

const router = Router();

router.get('/', (_req, res) => {
  try {
    const config = readJSON<PensumConfig>('pensum.json', {});
    res.json(config);
  } catch (err) {
    console.error('[pensum] GET / failed:', err);
    res.status(500).json({ error: 'Failed to read pensum config' });
  }
});

router.put('/:schuljahrLabel', (req, res) => {
  try {
    const { lektionen } = req.body as { lektionen: unknown };
    if (typeof lektionen !== 'number' || lektionen < 0 || lektionen > 100) {
      res.status(400).json({ error: 'lektionen must be a number between 0 and 100' });
      return;
    }
    const label = decodeURIComponent(req.params.schuljahrLabel);
    if (label.length > 200) {
      res.status(400).json({ error: 'schuljahrLabel too long' });
      return;
    }
    // Prevent prototype pollution via key injection
    if (label === '__proto__' || label === 'constructor' || label === 'prototype') {
      res.status(400).json({ error: 'Invalid label' });
      return;
    }
    const config = readJSON<PensumConfig>('pensum.json', {});
    config[label] = lektionen;
    writeJSON('pensum.json', config);
    res.json(config);
  } catch (err) {
    console.error('[pensum] PUT /:schuljahrLabel failed:', err);
    res.status(500).json({ error: 'Failed to update pensum config' });
  }
});

export default router;
