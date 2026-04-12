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

export type ProgressResponse = {
  days: Record<string, DayProgress>;
  checklists: Record<string, ChecklistProgress>;
};

export type NoteResponse = {
  body: string;
  updated_at: string;
};
