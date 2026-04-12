import type { PlanResponse } from '../shared/types';

export async function fetchPlan(): Promise<PlanResponse> {
  const res = await fetch('/api/plan');
  if (!res.ok) throw new Error(`Failed to fetch plan: ${res.status} ${res.statusText}`);
  return res.json() as Promise<PlanResponse>;
}
