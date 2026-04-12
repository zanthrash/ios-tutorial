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
