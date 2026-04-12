import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ProgressResponse, DayStatus, ResourceStatus } from '../shared/types';
import { patchDayStatus, patchChecklistItem, patchResourceStatus } from './api';

type ProgressContextType = {
  progress: ProgressResponse;
  setDayStatus: (dayId: string, status: DayStatus) => void;
  setChecklistItem: (itemId: string, checked: boolean) => void;
  setResourceStatus: (url: string, status: ResourceStatus) => void;
};

const ProgressContext = createContext<ProgressContextType | null>(null);

export function ProgressProvider({
  children,
  initialProgress,
}: {
  children: ReactNode;
  initialProgress: ProgressResponse;
}) {
  const [progress, setProgress] = useState<ProgressResponse>(initialProgress);

  const setDayStatus = useCallback((dayId: string, status: DayStatus) => {
    const now = new Date().toISOString();
    setProgress((prev) => {
      const existing = prev.days[dayId];
      return {
        ...prev,
        days: {
          ...prev.days,
          [dayId]: {
            day_id: dayId,
            status,
            started_at: existing?.started_at ?? (status !== 'todo' ? now : null),
            completed_at: status === 'done' ? now : (existing?.completed_at ?? null),
            updated_at: now,
          },
        },
      };
    });
    patchDayStatus(dayId, status).catch(console.error);
  }, []);

  const setChecklistItem = useCallback((itemId: string, checked: boolean) => {
    const now = new Date().toISOString();
    setProgress((prev) => ({
      ...prev,
      checklists: {
        ...prev.checklists,
        [itemId]: { item_id: itemId, checked, updated_at: now },
      },
    }));
    patchChecklistItem(itemId, checked).catch(console.error);
  }, []);

  const setResourceStatus = useCallback((url: string, status: ResourceStatus) => {
    const now = new Date().toISOString();
    setProgress((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        [url]: { url, status, updated_at: now },
      },
    }));
    patchResourceStatus(url, status).catch(console.error);
  }, []);

  return (
    <ProgressContext.Provider value={{ progress, setDayStatus, setChecklistItem, setResourceStatus }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
