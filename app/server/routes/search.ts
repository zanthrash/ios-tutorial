import { Hono } from 'hono';
import db from '../db';
import { getPlan } from '../planCache';
import type { SearchResult, SearchResponse } from '../../shared/types';
import type { Phase, Week, Day } from '../../shared/types';

const router = new Hono();

function snippet(text: string, q: string, width = 160): string {
  const lower = text.toLowerCase();
  const qi = lower.indexOf(q.toLowerCase());
  if (qi === -1) return text.slice(0, width) + (text.length > width ? '…' : '');
  const start = Math.max(0, qi - 60);
  const end = Math.min(text.length, start + width);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function dayIdToUrl(dayId: string): string {
  // dayId = "phase-1/week-2/urlsession-basics"
  const parts = dayId.split('/');
  const phaseId = parts[0];
  const weekNum = parts[1].replace('week-', '');
  const slug = parts.slice(2).join('/');
  return `/phase/${phaseId}/week/${weekNum}/day/${slug}`;
}

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// GET /api/search?q=...
router.get('/search', (c) => {
  const q = (c.req.query('q') ?? '').trim();
  if (q.length < 2) {
    return c.json({ query: q, results: [] } satisfies SearchResponse);
  }

  const results: SearchResult[] = [];

  // --- Notes search (SQLite LIKE) ---
  type NoteRow = { scope_id: string; body: string; updated_at: string };

  const dayNoteRows = db
    .query<NoteRow, [string]>(
      `SELECT day_id AS scope_id, body, updated_at FROM day_notes WHERE body LIKE ? COLLATE NOCASE`,
    )
    .all(`%${q}%`);

  const phaseNoteRows = db
    .query<NoteRow, [string]>(
      `SELECT phase_id AS scope_id, body, updated_at FROM phase_notes WHERE body LIKE ? COLLATE NOCASE`,
    )
    .all(`%${q}%`);

  // Resolve labels for day notes using the plan
  let plan: Phase[];
  try {
    plan = getPlan();
  } catch {
    plan = [];
  }

  // Build quick lookups
  const dayMap = new Map<string, { phase: Phase; week: Week; day: Day }>();
  const phaseMap = new Map<string, Phase>();
  for (const phase of plan) {
    phaseMap.set(phase.id, phase);
    for (const week of phase.weeks) {
      for (const day of week.days) {
        dayMap.set(day.id, { phase, week, day });
      }
    }
  }

  for (const row of dayNoteRows) {
    const entry = dayMap.get(row.scope_id);
    const label = entry
      ? `Phase ${entry.phase.number} › ${entry.week.title} › ${entry.day.heading}`
      : row.scope_id;
    results.push({
      type: 'day-note',
      id: row.scope_id,
      label,
      snippet: snippet(row.body, q),
      url: dayIdToUrl(row.scope_id),
    });
  }

  for (const row of phaseNoteRows) {
    const phase = phaseMap.get(row.scope_id);
    const label = phase ? `Phase ${phase.number} — ${phase.title} (notes)` : row.scope_id;
    results.push({
      type: 'phase-note',
      id: row.scope_id,
      label,
      snippet: snippet(row.body, q),
      url: `/phase/${row.scope_id}`,
    });
  }

  // --- Plan content scan ---
  for (const phase of plan) {
    for (const week of phase.weeks) {
      for (const day of week.days) {
        if (
          matchesQuery(day.heading, q) ||
          matchesQuery(day.bodyMarkdown, q)
        ) {
          const matchText = matchesQuery(day.heading, q) ? day.heading : day.bodyMarkdown;
          results.push({
            type: 'plan',
            id: day.id,
            label: `Phase ${phase.number} › ${week.title} › ${day.heading}`,
            snippet: snippet(matchText, q),
            url: dayIdToUrl(day.id),
          });
        }
      }
    }
  }

  return c.json({ query: q, results } satisfies SearchResponse);
});

export default router;
