import { Hono } from 'hono';
import db from '../db';
import { getPlan } from '../planCache';

const router = new Hono();

// GET /api/export
// Returns my-notes.md: phase-ordered concatenation of all notes with headings.
// Only includes phases/days that have at least one note.
router.get('/export', (c) => {
  const phases = getPlan();

  const dayNotesMap = new Map<string, string>();
  const phaseNotesMap = new Map<string, string>();

  const dayRows = db.query('SELECT day_id, body FROM day_notes').all() as { day_id: string; body: string }[];
  for (const row of dayRows) {
    dayNotesMap.set(row.day_id, row.body);
  }

  const phaseRows = db.query('SELECT phase_id, body FROM phase_notes').all() as { phase_id: string; body: string }[];
  for (const row of phaseRows) {
    phaseNotesMap.set(row.phase_id, row.body);
  }

  const sections: string[] = [];

  for (const phase of phases) {
    const phaseNote = phaseNotesMap.get(phase.id);
    const dayNotesInPhase: string[] = [];

    for (const week of phase.weeks) {
      for (const day of week.days) {
        const note = dayNotesMap.get(day.id);
        if (note?.trim()) {
          dayNotesInPhase.push(
            `### Week ${week.number} › ${day.heading}\n\n${note.trim()}`
          );
        }
      }
    }

    const hasContent = phaseNote?.trim() || dayNotesInPhase.length > 0;
    if (!hasContent) continue;

    const phaseParts: string[] = [`# Phase ${phase.number} — ${phase.title}`];

    if (phaseNote?.trim()) {
      phaseParts.push(phaseNote.trim());
    }

    if (dayNotesInPhase.length > 0) {
      phaseParts.push(...dayNotesInPhase);
    }

    sections.push(phaseParts.join('\n\n'));
  }

  const markdown = sections.join('\n\n---\n\n');
  const output = markdown.trim()
    ? `# My iOS Tutorial Notes\n\n_Exported ${new Date().toISOString().slice(0, 10)}_\n\n---\n\n${markdown}\n`
    : '# My iOS Tutorial Notes\n\n_No notes yet._\n';

  c.header('Content-Type', 'text/markdown; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="my-notes.md"');
  return c.body(output);
});

export default router;
