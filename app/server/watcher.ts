import { watch } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { invalidatePlan } from './planCache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// server/ → app/ → repo root (where PHASE_*.md files live)
const PHASES_DIR = join(__dirname, '../..');

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startWatcher(): void {
  const watcher = watch(PHASES_DIR, { recursive: false }, (event, filename) => {
    if (!filename || !filename.match(/^PHASE_\d+\.md$/)) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`[watcher] ${filename} changed — invalidating plan cache`);
      invalidatePlan();
      debounceTimer = null;
    }, 100);
  });

  watcher.on('error', (err) => {
    console.error('[watcher] error:', err);
  });

  console.log(`[watcher] watching ${PHASES_DIR} for PHASE_*.md changes`);
}
