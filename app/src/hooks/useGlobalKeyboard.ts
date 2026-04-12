import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { PlanResponse } from '../../shared/types';

function buildDayList(plan: PlanResponse): string[] {
  const urls: string[] = [];
  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      for (const day of week.days) {
        const slug = day.id.split('/').pop()!;
        urls.push(`/phase/${phase.id}/week/${week.number}/day/${slug}`);
      }
    }
  }
  return urls;
}

/**
 * Global keyboard shortcuts:
 *   j / k  — navigate to next / previous day (only when on a day view)
 *   ?      — toggle keyboard help overlay
 *
 * Skips events when focus is inside an input, textarea, or select.
 */
export function useGlobalKeyboard(
  plan: PlanResponse | null,
  onToggleHelp: () => void,
) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!plan) return;

    const dayList = buildDayList(plan);

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as Element;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      const currentIndex = dayList.indexOf(location.pathname);
      // j/k only apply when already on a day view
      if (currentIndex === -1) return;

      if (e.key === 'j') {
        e.preventDefault();
        if (currentIndex < dayList.length - 1) {
          navigate(dayList[currentIndex + 1]);
        }
      } else if (e.key === 'k') {
        e.preventDefault();
        if (currentIndex > 0) {
          navigate(dayList[currentIndex - 1]);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [plan, navigate, location.pathname, onToggleHelp]);
}
