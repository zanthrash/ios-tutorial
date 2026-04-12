import { Hono } from 'hono';
import db from '../db';
import type { NoteResponse } from '../../shared/types';

const notes = new Hono();

// GET /api/notes/day/:dayId
notes.get('/notes/day/:dayId', (c) => {
  const dayId = decodeURIComponent(c.req.param('dayId'));
  const row = db
    .query('SELECT body, updated_at FROM day_notes WHERE day_id = ?')
    .get(dayId) as { body: string; updated_at: string } | null;
  if (!row) return c.json(null);
  return c.json({ body: row.body, updated_at: row.updated_at } satisfies NoteResponse);
});

// PUT /api/notes/day/:dayId
notes.put('/notes/day/:dayId', async (c) => {
  const dayId = decodeURIComponent(c.req.param('dayId'));
  const { body } = await c.req.json<{ body: string }>();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO day_notes (day_id, body, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(day_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    [dayId, body, now],
  );
  return c.json({ body, updated_at: now } satisfies NoteResponse);
});

// GET /api/notes/phase/:phaseId
notes.get('/notes/phase/:phaseId', (c) => {
  const phaseId = c.req.param('phaseId');
  const row = db
    .query('SELECT body, updated_at FROM phase_notes WHERE phase_id = ?')
    .get(phaseId) as { body: string; updated_at: string } | null;
  if (!row) return c.json(null);
  return c.json({ body: row.body, updated_at: row.updated_at } satisfies NoteResponse);
});

// PUT /api/notes/phase/:phaseId
notes.put('/notes/phase/:phaseId', async (c) => {
  const phaseId = c.req.param('phaseId');
  const { body } = await c.req.json<{ body: string }>();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO phase_notes (phase_id, body, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(phase_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    [phaseId, body, now],
  );
  return c.json({ body, updated_at: now } satisfies NoteResponse);
});

export default notes;
