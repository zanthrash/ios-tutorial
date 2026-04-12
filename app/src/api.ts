import type { PlanResponse, ProgressResponse, DayStatus, NoteResponse, ResourceStatus, SearchResponse, OrphansResponse } from '../shared/types';

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

export async function patchResourceStatus(url: string, status: ResourceStatus): Promise<void> {
  const res = await fetch('/api/progress/resource', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, status }),
  });
  if (!res.ok) throw new Error(`Failed to update resource status: ${res.status}`);
}

export async function fetchDayNote(dayId: string): Promise<NoteResponse | null> {
  const res = await fetch(`/api/notes/day/${encodeURIComponent(dayId)}`);
  if (!res.ok) throw new Error(`Failed to fetch day note: ${res.status}`);
  return res.json() as Promise<NoteResponse | null>;
}

export async function putDayNote(dayId: string, body: string): Promise<NoteResponse> {
  const res = await fetch(`/api/notes/day/${encodeURIComponent(dayId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`Failed to save day note: ${res.status}`);
  return res.json() as Promise<NoteResponse>;
}

export async function fetchPhaseNote(phaseId: string): Promise<NoteResponse | null> {
  const res = await fetch(`/api/notes/phase/${encodeURIComponent(phaseId)}`);
  if (!res.ok) throw new Error(`Failed to fetch phase note: ${res.status}`);
  return res.json() as Promise<NoteResponse | null>;
}

export async function putPhaseNote(phaseId: string, body: string): Promise<NoteResponse> {
  const res = await fetch(`/api/notes/phase/${encodeURIComponent(phaseId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`Failed to save phase note: ${res.status}`);
  return res.json() as Promise<NoteResponse>;
}

export async function searchContent(q: string): Promise<SearchResponse> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json() as Promise<SearchResponse>;
}

export async function fetchOrphans(): Promise<OrphansResponse> {
  const res = await fetch('/api/orphans');
  if (!res.ok) throw new Error(`Failed to fetch orphans: ${res.status}`);
  return res.json() as Promise<OrphansResponse>;
}

export async function deleteOrphans(): Promise<{ deleted: number }> {
  const res = await fetch('/api/orphans', { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete orphans: ${res.status}`);
  return res.json() as Promise<{ deleted: number }>;
}
