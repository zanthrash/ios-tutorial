import { Hono } from 'hono';
import db from '../db';
import { getPlan } from '../planCache';
import type { OrphanRecord, OrphansResponse } from '../../shared/types';
import type { Phase } from '../../shared/types';

const orphans = new Hono();

function getValidIds(plan: Phase[]) {
  const dayIds = new Set<string>();
  const checklistIds = new Set<string>();
  const phaseIds = new Set<string>();
  const resourceUrls = new Set<string>();

  for (const phase of plan) {
    phaseIds.add(phase.id);
    for (const week of phase.weeks) {
      for (const day of week.days) {
        dayIds.add(day.id);
        for (const item of day.inlineChecklistItems) {
          checklistIds.add(item.id);
        }
      }
    }
    for (const item of phase.masteryGate.checklist) {
      checklistIds.add(item.id);
    }
    for (const group of phase.resources) {
      for (const resource of group.items) {
        resourceUrls.add(resource.url);
      }
    }
  }

  return { dayIds, checklistIds, phaseIds, resourceUrls };
}

// GET /api/orphans — find DB rows that don't match current plan IDs
orphans.get('/orphans', (c) => {
  const plan = getPlan();
  const { dayIds, checklistIds, phaseIds, resourceUrls } = getValidIds(plan);

  const dayProgressRows = db.query(
    'SELECT day_id, status, updated_at FROM day_progress'
  ).all() as Array<{ day_id: string; status: string; updated_at: string }>;

  const checklistRows = db.query(
    'SELECT item_id, checked, updated_at FROM checklist_progress'
  ).all() as Array<{ item_id: string; checked: number; updated_at: string }>;

  const dayNoteRows = db.query(
    'SELECT day_id, updated_at FROM day_notes'
  ).all() as Array<{ day_id: string; updated_at: string }>;

  const phaseNoteRows = db.query(
    'SELECT phase_id, updated_at FROM phase_notes'
  ).all() as Array<{ phase_id: string; updated_at: string }>;

  const resourceRows = db.query(
    'SELECT url, status, updated_at FROM resource_progress'
  ).all() as Array<{ url: string; status: string; updated_at: string }>;

  const orphanDayProgress: OrphanRecord[] = dayProgressRows
    .filter((r) => !dayIds.has(r.day_id))
    .map((r) => ({ id: r.day_id, type: 'day-progress', detail: r.status, updated_at: r.updated_at }));

  const orphanChecklists: OrphanRecord[] = checklistRows
    .filter((r) => !checklistIds.has(r.item_id))
    .map((r) => ({ id: r.item_id, type: 'checklist', detail: r.checked ? 'checked' : 'unchecked', updated_at: r.updated_at }));

  const orphanDayNotes: OrphanRecord[] = dayNoteRows
    .filter((r) => !dayIds.has(r.day_id))
    .map((r) => ({ id: r.day_id, type: 'day-note', updated_at: r.updated_at }));

  const orphanPhaseNotes: OrphanRecord[] = phaseNoteRows
    .filter((r) => !phaseIds.has(r.phase_id))
    .map((r) => ({ id: r.phase_id, type: 'phase-note', updated_at: r.updated_at }));

  const orphanResources: OrphanRecord[] = resourceRows
    .filter((r) => !resourceUrls.has(r.url))
    .map((r) => ({ id: r.url, type: 'resource', detail: r.status, updated_at: r.updated_at }));

  const total =
    orphanDayProgress.length +
    orphanChecklists.length +
    orphanDayNotes.length +
    orphanPhaseNotes.length +
    orphanResources.length;

  const response: OrphansResponse = {
    total,
    dayProgress: orphanDayProgress,
    checklists: orphanChecklists,
    dayNotes: orphanDayNotes,
    phaseNotes: orphanPhaseNotes,
    resources: orphanResources,
  };

  return c.json(response);
});

// DELETE /api/orphans — delete all orphaned rows from DB
orphans.delete('/orphans', (c) => {
  const plan = getPlan();
  const { dayIds, checklistIds, phaseIds, resourceUrls } = getValidIds(plan);

  let deleted = 0;

  const dayProgressRows = db.query('SELECT day_id FROM day_progress').all() as Array<{ day_id: string }>;
  for (const r of dayProgressRows) {
    if (!dayIds.has(r.day_id)) {
      db.run('DELETE FROM day_progress WHERE day_id = ?', [r.day_id]);
      deleted++;
    }
  }

  const checklistRows = db.query('SELECT item_id FROM checklist_progress').all() as Array<{ item_id: string }>;
  for (const r of checklistRows) {
    if (!checklistIds.has(r.item_id)) {
      db.run('DELETE FROM checklist_progress WHERE item_id = ?', [r.item_id]);
      deleted++;
    }
  }

  const dayNoteRows = db.query('SELECT day_id FROM day_notes').all() as Array<{ day_id: string }>;
  for (const r of dayNoteRows) {
    if (!dayIds.has(r.day_id)) {
      db.run('DELETE FROM day_notes WHERE day_id = ?', [r.day_id]);
      deleted++;
    }
  }

  const phaseNoteRows = db.query('SELECT phase_id FROM phase_notes').all() as Array<{ phase_id: string }>;
  for (const r of phaseNoteRows) {
    if (!phaseIds.has(r.phase_id)) {
      db.run('DELETE FROM phase_notes WHERE phase_id = ?', [r.phase_id]);
      deleted++;
    }
  }

  const resourceRows = db.query('SELECT url FROM resource_progress').all() as Array<{ url: string }>;
  for (const r of resourceRows) {
    if (!resourceUrls.has(r.url)) {
      db.run('DELETE FROM resource_progress WHERE url = ?', [r.url]);
      deleted++;
    }
  }

  return c.json({ deleted });
});

export default orphans;
