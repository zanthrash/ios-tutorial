export type ChecklistItem = { id: string; text: string };

export type Day = {
  id: string;
  heading: string;
  timeBudget?: string;
  bodyMarkdown: string;
  inlineChecklistItems: ChecklistItem[];
};

export type Week = {
  id: string;
  number: number;
  title: string;
  goal?: string;
  days: Day[];
};

export type MasteryGate = {
  id: string;
  bodyMarkdown: string;
  checklist: ChecklistItem[];
};

export type ResourceGroup = {
  category: 'primary' | 'videos-must' | 'videos-optional' | 'books' | 'free-alt' | 'tools' | 'apple-dev';
  label: string;
  items: Resource[];
};

export type Resource = { id: string; url: string; label: string };

export type Phase = {
  id: string;
  number: number;
  title: string;
  duration: string;
  translatingToYourOwnApp?: string;
  willNotDo: string;
  whatYoullHave: string;
  weeks: Week[];
  masteryGate: MasteryGate;
  resources: ResourceGroup[];
  ifStuck: string;
  whenDone: string;
};

export type PlanResponse = { phases: Phase[] };

// Progress types

export type DayStatus = 'todo' | 'in_progress' | 'done' | 'skipped';

export type DayProgress = {
  day_id: string;
  status: DayStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type ChecklistProgress = {
  item_id: string;
  checked: boolean;
  updated_at: string;
};

export type ResourceStatus = 'unread' | 'reading' | 'done' | 'skip';

export type ResourceProgress = {
  url: string;
  status: ResourceStatus;
  updated_at: string;
};

export type ProgressResponse = {
  days: Record<string, DayProgress>;
  checklists: Record<string, ChecklistProgress>;
  resources: Record<string, ResourceProgress>;
};

export type NoteResponse = {
  body: string;
  updated_at: string;
};

export type SearchResult = {
  type: 'day-note' | 'phase-note' | 'plan';
  id: string;
  label: string;
  snippet: string;
  url: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
};

export type RecentNote = {
  id: string;
  type: 'day' | 'phase';
  label: string;
  snippet: string;
  updated_at: string;
  url: string;
};

export type OrphanRecord = {
  id: string;
  type: 'day-progress' | 'checklist' | 'day-note' | 'phase-note' | 'resource';
  detail?: string;
  updated_at: string;
};

export type OrphansResponse = {
  total: number;
  dayProgress: OrphanRecord[];
  checklists: OrphanRecord[];
  dayNotes: OrphanRecord[];
  phaseNotes: OrphanRecord[];
  resources: OrphanRecord[];
};
