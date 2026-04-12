import { Hono } from 'hono';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { parseAllPhases } from '../parser';
import type { Phase } from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// server/routes/ → server/ → app/ → repo root
const PHASES_DIR = join(__dirname, '../../..');

const router = new Hono();

let cachedPhases: Phase[] | null = null;

function getPlan(): Phase[] {
  if (!cachedPhases) {
    cachedPhases = parseAllPhases(PHASES_DIR);
  }
  return cachedPhases;
}

router.get('/plan', (c) => {
  try {
    const phases = getPlan();
    return c.json({ phases });
  } catch (err) {
    console.error('Failed to parse plan:', err);
    return c.json({ error: String(err) }, 500);
  }
});

export default router;
