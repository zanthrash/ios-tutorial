import { Database } from 'bun:sqlite';
import { join } from 'path';
import { mkdirSync } from 'fs';

const DATA_DIR = join(import.meta.dir, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'progress.db'));

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

db.run(`
  CREATE TABLE IF NOT EXISTS day_progress (
    day_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('todo','in_progress','done','skipped')) DEFAULT 'todo',
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS checklist_progress (
    item_id TEXT PRIMARY KEY,
    checked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS day_notes (
    day_id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS phase_notes (
    phase_id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS resource_progress (
    url TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('unread','reading','done','skip')) DEFAULT 'unread',
    updated_at TEXT NOT NULL
  )
`);

export default db;
