import { createContext, useContext } from 'react';
import type { PlanResponse } from '../shared/types';

export const PlanContext = createContext<PlanResponse | null>(null);

export function usePlan(): PlanResponse {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside PlanContext.Provider');
  return ctx;
}
