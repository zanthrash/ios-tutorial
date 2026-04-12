import type { PlanResponse, ProgressResponse, DayStatus } from '../shared/types';

export async function fetchPlan(): Promise<PlanResponse> {
  const res = await fetch('/api/plan');
  if (!res.ok) throw new Error(`Failed to fetch plan: ${res.status} ${res.statusText}`);
  return res.json() as Promise<PlanResponse>;
}

export async function fetchProgress(): Promise<ProgressResponse> {
  const res = await fetch('/api/progress');
  if (!res.ok) throw new Error(`Failed to fetch progress: ${res.status} ${res.statusText}`);
  return res.json() as Promise<ProgressResponse>;
}

export async function patchDayStatus(dayId: string, status: DayStatus): Promise<void> {
  const res = await fetch(`/api/progress/day/${encodeURIComponent(dayId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update day status: ${res.status}`);
}

export async function patchChecklistItem(itemId: string, checked: boolean): Promise<void> {
  const res = await fetch('/api/progress/checklist', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, checked }),
  });
  if (!res.ok) throw new Error(`Failed to update checklist item: ${res.status}`);
}
