import GithubSlugger from 'github-slugger';

export function slugify(text: string): string {
  const slugger = new GithubSlugger();
  return slugger.slug(text);
}

export function makePhaseId(phaseNumber: number): string {
  return `phase-${phaseNumber}`;
}

export function makeWeekId(phaseId: string, weekNumber: number): string {
  return `${phaseId}/week-${weekNumber}`;
}

export function makeDayId(weekId: string, heading: string): string {
  return `${weekId}/${slugify(heading)}`;
}

export function makeMasteryGateId(phaseId: string): string {
  return `${phaseId}/mastery-gate`;
}
