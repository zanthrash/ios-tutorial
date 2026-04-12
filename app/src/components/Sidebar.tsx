import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Phase, Week } from '../../shared/types';

interface SidebarProps {
  phases: Phase[];
}

export default function Sidebar({ phases }: SidebarProps) {
  const location = useLocation();

  // Auto-expand the phase that contains the current route.
  function activePhaseId(): string | null {
    const m = location.pathname.match(/^\/phase\/(phase-\d+)/);
    return m ? m[1] : null;
  }

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => {
    const active = activePhaseId();
    return active ? new Set([active]) : new Set(['phase-0']);
  });
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // When route changes, ensure the active phase is expanded.
  useEffect(() => {
    const active = activePhaseId();
    if (active) {
      setExpandedPhases((prev) => {
        if (prev.has(active)) return prev;
        return new Set([...prev, active]);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }

  function toggleWeek(weekId: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  }

  function isActivePath(path: string) {
    return location.pathname === path;
  }

  function isActiveDay(phaseId: string, weekNum: number, daySlug: string) {
    return isActivePath(`/phase/${phaseId}/week/${weekNum}/day/${daySlug}`);
  }

  return (
    <nav
      aria-label="Tutorial navigation"
      className="h-full flex flex-col"
    >
      {/* Top bar */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <Link
          to="/"
          className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
        >
          iOS Tutorial
        </Link>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-2">
        <ul>
          {phases.map((phase) => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              isExpanded={expandedPhases.has(phase.id)}
              onToggle={() => togglePhase(phase.id)}
              expandedWeeks={expandedWeeks}
              onToggleWeek={toggleWeek}
              isActivePath={isActivePath}
              isActiveDay={isActiveDay}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}

interface PhaseItemProps {
  phase: Phase;
  isExpanded: boolean;
  onToggle: () => void;
  expandedWeeks: Set<string>;
  onToggleWeek: (weekId: string) => void;
  isActivePath: (path: string) => boolean;
  isActiveDay: (phaseId: string, weekNum: number, daySlug: string) => boolean;
}

function PhaseItem({
  phase,
  isExpanded,
  onToggle,
  expandedWeeks,
  onToggleWeek,
  isActivePath,
  isActiveDay,
}: PhaseItemProps) {
  const phaseActive = isActivePath(`/phase/${phase.id}`) ||
    isActivePath(`/phase/${phase.id}/mastery`) ||
    isActivePath(`/phase/${phase.id}/resources`);

  return (
    <li>
      {/* Phase header row */}
      <div className="flex items-center group">
        <button
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
          aria-label={isExpanded ? 'Collapse phase' : 'Expand phase'}
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Link
          to={`/phase/${phase.id}`}
          className={`flex-1 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md mx-1 truncate ${
            phaseActive
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Phase {phase.number} — {phase.title}
        </Link>
      </div>

      {/* Weeks + days */}
      {isExpanded && (
        <ul className="mt-0.5 mb-1">
          {phase.weeks.map((week) => (
            <WeekItem
              key={week.id}
              phase={phase}
              week={week}
              isExpanded={expandedWeeks.has(week.id)}
              onToggle={() => onToggleWeek(week.id)}
              isActiveDay={isActiveDay}
            />
          ))}

          {/* Mastery gate + Resources links */}
          <li>
            <Link
              to={`/phase/${phase.id}/mastery`}
              className={`block pl-10 pr-3 py-0.5 text-xs rounded-md mx-1 ${
                isActivePath(`/phase/${phase.id}/mastery`)
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Mastery gate
            </Link>
          </li>
          <li>
            <Link
              to={`/phase/${phase.id}/resources`}
              className={`block pl-10 pr-3 py-0.5 text-xs rounded-md mx-1 mb-1 ${
                isActivePath(`/phase/${phase.id}/resources`)
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Resources
            </Link>
          </li>
        </ul>
      )}
    </li>
  );
}

interface WeekItemProps {
  phase: Phase;
  week: Week;
  isExpanded: boolean;
  onToggle: () => void;
  isActiveDay: (phaseId: string, weekNum: number, daySlug: string) => boolean;
}

function WeekItem({ phase, week, isExpanded, onToggle, isActiveDay }: WeekItemProps) {
  const hasActiveDay = week.days.some((d) => {
    const slug = d.id.split('/').pop()!;
    return isActiveDay(phase.id, week.number, slug);
  });

  // Auto-expand if a day in this week is active
  useEffect(() => {
    if (hasActiveDay && !isExpanded) onToggle();
    // Only run on mount / when hasActiveDay changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveDay]);

  return (
    <li>
      <div className="flex items-center">
        <button
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 ml-6"
          aria-label={isExpanded ? 'Collapse week' : 'Expand week'}
        >
          <svg
            className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={onToggle}
          className={`flex-1 text-left px-2 py-1 text-xs rounded-md mx-1 truncate ${
            hasActiveDay
              ? 'text-gray-800 dark:text-gray-200 font-medium'
              : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Week {week.number} — {week.title}
        </button>
      </div>

      {isExpanded && (
        <ul className="mb-0.5">
          {week.days.map((day) => {
            const slug = day.id.split('/').pop()!;
            const to = `/phase/${phase.id}/week/${week.number}/day/${slug}`;
            const active = isActiveDay(phase.id, week.number, slug);
            return (
              <li key={day.id}>
                <Link
                  to={to}
                  className={`block pl-14 pr-3 py-0.5 text-xs rounded-md mx-1 truncate ${
                    active
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium'
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {day.heading}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
