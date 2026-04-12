import { parseAllPhases } from './parser';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import type { Phase } from '../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// server/ → app/ → repo root
const PHASES_DIR = join(__dirname, '../..');

let cache: Phase[] | null = null;

export function getPlan(): Phase[] {
  if (!cache) cache = parseAllPhases(PHASES_DIR);
  return cache;
}

export function invalidatePlan(): void {
  cache = null;
}
