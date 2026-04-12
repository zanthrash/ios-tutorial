import { Hono } from 'hono';
import db from '../db';
import { getPlan } from '../planCache';
import type { NoteResponse, RecentNote } from '../../shared/types';

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

// GET /api/notes/recent?limit=N — most recently updated notes (day + phase), enriched with URLs
notes.get('/notes/recent', (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? '5'), 20);

  const plan = getPlan();

  // Build lookup maps from plan
  const dayMap = new Map<string, { phaseId: string; weekNum: number; slug: string; heading: string }>();
  for (const phase of plan) {
    for (const week of phase.weeks) {
      for (const day of week.days) {
        const slug = day.id.split('/').pop()!;
        dayMap.set(day.id, { phaseId: phase.id, weekNum: week.number, slug, heading: day.heading });
      }
    }
  }
  const phaseMap = new Map<string, string>();
  for (const phase of plan) {
    phaseMap.set(phase.id, phase.title);
  }

  const dayRows = db.query(
    'SELECT day_id as id, body, updated_at FROM day_notes'
  ).all() as Array<{ id: string; body: string; updated_at: string }>;

  const phaseRows = db.query(
    'SELECT phase_id as id, body, updated_at FROM phase_notes'
  ).all() as Array<{ id: string; body: string; updated_at: string }>;

  const results: RecentNote[] = [];

  for (const row of dayRows) {
    const info = dayMap.get(row.id);
    if (!info) continue; // orphan — skip
    results.push({
      id: row.id,
      type: 'day',
      label: info.heading,
      snippet: row.body.trim().slice(0, 120).replace(/\n+/g, ' '),
      updated_at: row.updated_at,
      url: `/phase/${info.phaseId}/week/${info.weekNum}/day/${info.slug}`,
    });
  }

  for (const row of phaseRows) {
    const title = phaseMap.get(row.id);
    if (!title) continue; // orphan — skip
    results.push({
      id: row.id,
      type: 'phase',
      label: `Phase notes — ${title}`,
      snippet: row.body.trim().slice(0, 120).replace(/\n+/g, ' '),
      updated_at: row.updated_at,
      url: `/phase/${row.id}`,
    });
  }

  results.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return c.json(results.slice(0, limit));
});

export default notes;
