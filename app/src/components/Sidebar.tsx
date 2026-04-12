import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Phase, Week, ProgressResponse } from '../../shared/types';
import SearchBar from './SearchBar';

interface SidebarProps {
  phases: Phase[];
  progress: ProgressResponse;
  onShowHelp: () => void;
}

function statusDot(status: string | undefined) {
  if (status === 'done') return 'text-green-500';
  if (status === 'in_progress') return 'text-blue-400';
  if (status === 'skipped') return 'text-gray-400';
  return null;
}

function StatusIndicator({ status }: { status: string | undefined }) {
  if (status === 'done') {
    return <span className="shrink-0 text-green-500 text-xs leading-none">✓</span>;
  }
  if (status === 'in_progress') {
    return <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />;
  }
  if (status === 'skipped') {
    return <span className="shrink-0 text-gray-400 text-xs leading-none">—</span>;
  }
  return <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-transparent inline-block" />;
}

export default function Sidebar({ phases, progress, onShowHelp }: SidebarProps) {
  const location = useLocation();

  function activePhaseId(): string | null {
    const m = location.pathname.match(/^\/phase\/(phase-\d+)/);
    return m ? m[1] : null;
  }

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => {
    const active = activePhaseId();
    return active ? new Set([active]) : new Set(['phase-0']);
  });
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

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

  // Overall progress stats
  const allDayIds = phases.flatMap((p) => p.weeks.flatMap((w) => w.days.map((d) => d.id)));
  const totalDays = allDayIds.length;
  const doneDays = allDayIds.filter((id) => progress.days[id]?.status === 'done').length;
  const inProgressDays = allDayIds.filter((id) => progress.days[id]?.status === 'in_progress').length;
  const progressPct = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;

  return (
    <nav aria-label="Tutorial navigation" className="h-full flex flex-col">
      {/* Top bar */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 space-y-2">
        <Link
          to="/"
          className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 block"
        >
          iOS Tutorial
        </Link>

        {/* Search */}
        <SearchBar />

        {/* Overall progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
            <span>{doneDays}/{totalDays} days done</span>
            {inProgressDays > 0 && (
              <span className="text-blue-400">{inProgressDays} in progress</span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Export notes + keyboard help */}
        <div className="flex gap-2">
          <a
            href="/api/export"
            download="my-notes.md"
            className="flex-1 text-center text-xs py-1 px-2 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            Export notes
          </a>
          <button
            type="button"
            onClick={onShowHelp}
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
            className="shrink-0 text-xs py-1 px-2 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 transition-colors font-mono"
          >
            ?
          </button>
        </div>
      </div>

      {/* Scrollable tree */}
      <div className="flex-1 overflow-y-auto py-2">
        <ul>
          {phases.map((phase) => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              progress={progress}
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
  progress: ProgressResponse;
  isExpanded: boolean;
  onToggle: () => void;
  expandedWeeks: Set<string>;
  onToggleWeek: (weekId: string) => void;
  isActivePath: (path: string) => boolean;
  isActiveDay: (phaseId: string, weekNum: number, daySlug: string) => boolean;
}

function PhaseItem({
  phase,
  progress,
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

  const phaseDayIds = phase.weeks.flatMap((w) => w.days.map((d) => d.id));
  const phaseDone = phaseDayIds.filter((id) => progress.days[id]?.status === 'done').length;
  const phaseTotal = phaseDayIds.length;
  const allDone = phaseTotal > 0 && phaseDone === phaseTotal;

  return (
    <li>
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
          className={`flex-1 min-w-0 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md mx-1 ${
            phaseActive
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span className="flex items-center justify-between gap-1">
            <span className="truncate">Phase {phase.number} — {phase.title}</span>
            {allDone ? (
              <span className="shrink-0 text-green-500 text-xs">✓</span>
            ) : phaseDone > 0 ? (
              <span className="shrink-0 text-gray-400 dark:text-gray-500 text-xs font-normal normal-case tracking-normal">
                {phaseDone}/{phaseTotal}
              </span>
            ) : null}
          </span>
        </Link>
      </div>

      {isExpanded && (
        <ul className="mt-0.5 mb-1">
          {phase.weeks.map((week) => (
            <WeekItem
              key={week.id}
              phase={phase}
              week={week}
              progress={progress}
              isExpanded={expandedWeeks.has(week.id)}
              onToggle={() => onToggleWeek(week.id)}
              isActiveDay={isActiveDay}
            />
          ))}

          <li>
            <MasteryGateLink phase={phase} progress={progress} isActivePath={isActivePath} />
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

function MasteryGateLink({
  phase,
  progress,
  isActivePath,
}: {
  phase: Phase;
  progress: ProgressResponse;
  isActivePath: (path: string) => boolean;
}) {
  const total = phase.masteryGate.checklist.length;
  const checked = phase.masteryGate.checklist.filter(
    (item) => progress.checklists[item.id]?.checked
  ).length;
  const passed = total > 0 && checked === total;

  return (
    <Link
      to={`/phase/${phase.id}/mastery`}
      className={`flex items-center gap-1.5 pl-10 pr-3 py-0.5 text-xs rounded-md mx-1 ${
        isActivePath(`/phase/${phase.id}/mastery`)
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {passed ? (
        <span className="text-green-500 leading-none">✓</span>
      ) : total > 0 && checked > 0 ? (
        <span className="text-gray-400 dark:text-gray-600 font-normal">{checked}/{total}</span>
      ) : null}
      Mastery gate
    </Link>
  );
}

interface WeekItemProps {
  phase: Phase;
  week: Week;
  progress: ProgressResponse;
  isExpanded: boolean;
  onToggle: () => void;
  isActiveDay: (phaseId: string, weekNum: number, daySlug: string) => boolean;
}

function WeekItem({ phase, week, progress, isExpanded, onToggle, isActiveDay }: WeekItemProps) {
  const hasActiveDay = week.days.some((d) => {
    const slug = d.id.split('/').pop()!;
    return isActiveDay(phase.id, week.number, slug);
  });

  useEffect(() => {
    if (hasActiveDay && !isExpanded) onToggle();
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
            const dayStatus = progress.days[day.id]?.status;
            return (
              <li key={day.id}>
                <Link
                  to={to}
                  className={`flex items-center gap-1.5 pl-12 pr-3 py-0.5 text-xs rounded-md mx-1 truncate ${
                    active
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium'
                      : dayStatus === 'done'
                      ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <StatusIndicator status={dayStatus} />
                  <span className="truncate">{day.heading}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
