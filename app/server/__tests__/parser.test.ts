import { describe, it, expect, beforeAll } from 'bun:test';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { parsePhaseFile, parseAllPhases } from '../parser';
import type { Phase } from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __tests__/ → server/ → app/ → repo root
const ROOT_DIR = join(__dirname, '../../..');

let phases: Phase[];

beforeAll(() => {
  phases = parseAllPhases(ROOT_DIR);
});

describe('parseAllPhases', () => {
  it('produces exactly 11 phases (PHASE_0 through PHASE_10)', () => {
    expect(phases).toHaveLength(11);
  });

  it('phases are ordered 0–10', () => {
    const numbers = phases.map((p) => p.number);
    expect(numbers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('each phase 1–10 has >= 3 weeks', () => {
    for (const phase of phases.filter((p) => p.number >= 1)) {
      expect(phase.weeks.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every phase has exactly one mastery gate', () => {
    for (const phase of phases) {
      expect(phase.masteryGate).toBeDefined();
      expect(phase.masteryGate.id).toBe(`phase-${phase.number}/mastery-gate`);
    }
  });

  it('mastery gates for phases 1–10 have at least one checklist item', () => {
    for (const phase of phases.filter((p) => p.number >= 1)) {
      expect(phase.masteryGate.checklist.length).toBeGreaterThan(0);
    }
  });

  it('total day count across all phases is in reasonable range', () => {
    const total = phases.reduce(
      (sum, p) => sum + p.weeks.reduce((ws, w) => ws + w.days.length, 0),
      0,
    );
    // Rough bounds: at least 50 days, fewer than 300
    expect(total).toBeGreaterThan(50);
    expect(total).toBeLessThan(300);
  });

  it('all phase IDs are unique', () => {
    const ids = phases.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all day IDs are unique within each phase', () => {
    for (const phase of phases) {
      const dayIds = phase.weeks.flatMap((w) => w.days.map((d) => d.id));
      expect(new Set(dayIds).size).toBe(dayIds.length);
    }
  });
});

describe('PHASE_0.md', () => {
  let phase0: Phase;

  beforeAll(() => {
    phase0 = parsePhaseFile(join(ROOT_DIR, 'PHASE_0.md'));
  });

  it('has id phase-0 and number 0', () => {
    expect(phase0.id).toBe('phase-0');
    expect(phase0.number).toBe(0);
  });

  it('has no translatingToYourOwnApp section', () => {
    expect(phase0.translatingToYourOwnApp).toBeUndefined();
  });

  it('has a synthetic Week 0 with prerequisites checklist', () => {
    const week0 = phase0.weeks.find((w) => w.number === 0);
    expect(week0).toBeDefined();
    expect(week0!.days).toHaveLength(1);
    expect(week0!.days[0].inlineChecklistItems.length).toBeGreaterThan(0);
  });

  it('has weeks 1–3', () => {
    const nums = phase0.weeks.map((w) => w.number);
    expect(nums).toContain(1);
    expect(nums).toContain(2);
    expect(nums).toContain(3);
  });

  it('has whatYoullHave and willNotDo', () => {
    expect(phase0.whatYoullHave.length).toBeGreaterThan(0);
    expect(phase0.willNotDo.length).toBeGreaterThan(0);
  });
});

describe('PHASE_1.md', () => {
  let phase1: Phase;

  beforeAll(() => {
    phase1 = parsePhaseFile(join(ROOT_DIR, 'PHASE_1.md'));
  });

  it('has id phase-1, title containing SwiftUI', () => {
    expect(phase1.id).toBe('phase-1');
    expect(phase1.title).toContain('SwiftUI');
  });

  it('has translatingToYourOwnApp section', () => {
    expect(phase1.translatingToYourOwnApp).toBeDefined();
    expect(phase1.translatingToYourOwnApp!.length).toBeGreaterThan(0);
  });

  it('has >= 6 weeks', () => {
    expect(phase1.weeks.length).toBeGreaterThanOrEqual(6);
  });

  it('week 1 has a goal and multiple days', () => {
    const w1 = phase1.weeks.find((w) => w.number === 1);
    expect(w1).toBeDefined();
    expect(w1!.goal).toBeDefined();
    expect(w1!.days.length).toBeGreaterThan(0);
  });

  it('mastery gate has checklist items', () => {
    expect(phase1.masteryGate.checklist.length).toBeGreaterThan(0);
  });

  it('has resources with at least two groups', () => {
    expect(phase1.resources.length).toBeGreaterThanOrEqual(2);
  });

  it('resources contain URLs', () => {
    const allItems = phase1.resources.flatMap((g) => g.items);
    expect(allItems.length).toBeGreaterThan(0);
    for (const item of allItems) {
      expect(item.url).toMatch(/^https?:\/\//);
    }
  });
});

describe('PHASE_3.md', () => {
  let phase3: Phase;

  beforeAll(() => {
    phase3 = parsePhaseFile(join(ROOT_DIR, 'PHASE_3.md'));
  });

  it('has >= 5 weeks', () => {
    expect(phase3.weeks.length).toBeGreaterThanOrEqual(5);
  });

  it('days have bodyMarkdown', () => {
    const days = phase3.weeks.flatMap((w) => w.days);
    for (const day of days) {
      expect(typeof day.bodyMarkdown).toBe('string');
    }
  });

  it('day IDs follow the phase-N/week-M/slug pattern', () => {
    const days = phase3.weeks.flatMap((w) => w.days);
    for (const day of days) {
      expect(day.id).toMatch(/^phase-3\/week-\d+\/.+/);
    }
  });
});
