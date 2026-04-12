import { Hono } from 'hono';
import db from '../db';
import type { DayStatus, DayProgress, ChecklistProgress, ProgressResponse } from '../../shared/types';

const progress = new Hono();

// GET /api/progress — all progress rows keyed by id
progress.get('/progress', (c) => {
  const dayRows = db.query('SELECT * FROM day_progress').all() as DayProgress[];
  const checklistRows = db.query('SELECT * FROM checklist_progress').all() as Array<{
    item_id: string;
    checked: number;
    updated_at: string;
  }>;

  const days: Record<string, DayProgress> = {};
  for (const row of dayRows) {
    days[row.day_id] = row;
  }

  const checklists: Record<string, ChecklistProgress> = {};
  for (const row of checklistRows) {
    checklists[row.item_id] = {
      item_id: row.item_id,
      checked: row.checked === 1,
      updated_at: row.updated_at,
    };
  }

  const response: ProgressResponse = { days, checklists };
  return c.json(response);
});

// PATCH /api/progress/day/:dayId — update day status
progress.patch('/progress/day/:dayId', async (c) => {
  const dayId = decodeURIComponent(c.req.param('dayId'));
  const body = await c.req.json<{ status: DayStatus }>();
  const { status } = body;

  const valid: DayStatus[] = ['todo', 'in_progress', 'done', 'skipped'];
  if (!valid.includes(status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const now = new Date().toISOString();
  const existing = db.query('SELECT * FROM day_progress WHERE day_id = ?').get(dayId) as DayProgress | null;

  const started_at =
    existing?.started_at ??
    (status === 'in_progress' || status === 'done' ? now : null);
  const completed_at = status === 'done' ? now : (existing?.completed_at ?? null);

  db.run(
    `INSERT INTO day_progress (day_id, status, started_at, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(day_id) DO UPDATE SET
       status = excluded.status,
       started_at = excluded.started_at,
       completed_at = excluded.completed_at,
       updated_at = excluded.updated_at`,
    [dayId, status, started_at, completed_at, now]
  );

  const result: DayProgress = { day_id: dayId, status, started_at, completed_at, updated_at: now };
  return c.json(result);
});

// PATCH /api/progress/checklist — update checklist item (itemId in body to avoid URL encoding issues)
progress.patch('/progress/checklist', async (c) => {
  const body = await c.req.json<{ itemId: string; checked: boolean }>();
  const { itemId, checked } = body;

  if (!itemId) return c.json({ error: 'itemId required' }, 400);

  const now = new Date().toISOString();

  db.run(
    `INSERT INTO checklist_progress (item_id, checked, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       checked = excluded.checked,
       updated_at = excluded.updated_at`,
    [itemId, checked ? 1 : 0, now]
  );

  const result: ChecklistProgress = { item_id: itemId, checked, updated_at: now };
  return c.json(result);
});

export default progress;
