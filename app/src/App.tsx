import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { PlanContext } from './PlanContext';
import { ProgressProvider } from './ProgressContext';
import { useProgress } from './ProgressContext';
import Sidebar from './components/Sidebar';
import DayView from './components/DayView';
import PhaseView from './components/PhaseView';
import MasteryGate from './components/MasteryGate';
import ResourcesPanel from './components/ResourcesPanel';
import SearchResults from './components/SearchResults';
import KeyboardHelp from './components/KeyboardHelp';
import OrphanWarning from './components/OrphanWarning';
import { useGlobalKeyboard } from './hooks/useGlobalKeyboard';
import { fetchPlan, fetchProgress, fetchOrphans, fetchRecentNotes } from './api';
import type { PlanResponse, ProgressResponse, OrphansResponse, Phase, Week, Day, RecentNote } from '../shared/types';

// --- helpers ---

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type CurrentDay = { phase: Phase; week: Week; day: Day };

function findCurrentDay(phases: Phase[], progress: ProgressResponse): CurrentDay | null {
  // 1. First in-progress day in plan order
  for (const phase of phases) {
    for (const week of phase.weeks) {
      for (const day of week.days) {
        if (progress.days[day.id]?.status === 'in_progress') return { phase, week, day };
      }
    }
  }

  // 2. Frontier: first todo day after the last done/skipped day
  const allDays: CurrentDay[] = [];
  for (const phase of phases) {
    for (const week of phase.weeks) {
      for (const day of week.days) {
        allDays.push({ phase, week, day });
      }
    }
  }

  let lastFinishedIdx = -1;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const s = progress.days[allDays[i].day.id]?.status;
    if (s === 'done' || s === 'skipped') { lastFinishedIdx = i; break; }
  }

  if (lastFinishedIdx >= 0 && lastFinishedIdx + 1 < allDays.length) {
    return allDays[lastFinishedIdx + 1];
  }

  // 3. No progress yet — first day
  return allDays[0] ?? null;
}

// --- Dashboard ---

function Dashboard({ plan }: { plan: PlanResponse }) {
  const { progress } = useProgress();
  const [orphans, setOrphans] = useState<OrphansResponse | null>(null);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);

  useEffect(() => {
    fetchOrphans().then(setOrphans).catch(() => {/* non-fatal */});
    fetchRecentNotes(3).then(setRecentNotes).catch(() => {/* non-fatal */});
  }, []);

  const phases = plan.phases;
  const allDayIds = phases.flatMap((p) => p.weeks.flatMap((w) => w.days.map((d) => d.id)));
  const totalDays = allDayIds.length;
  const doneDays = allDayIds.filter((id) => progress.days[id]?.status === 'done').length;
  const skippedDays = allDayIds.filter((id) => progress.days[id]?.status === 'skipped').length;
  const inProgressDays = allDayIds.filter((id) => progress.days[id]?.status === 'in_progress').length;
  const phasesStarted = phases.filter((p) =>
    p.weeks.some((w) => w.days.some((d) => progress.days[d.id]?.status !== undefined && progress.days[d.id]?.status !== 'todo'))
  ).length;
  const progressPct = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;

  const currentDay = findCurrentDay(phases, progress);

  return (
    <div className="max-w-2xl mx-auto px-8 py-12 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-1">
          iOS Mastery Curriculum
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {phases.length} phases · {totalDays} days · 12–18 month program
        </p>
      </div>

      {/* Orphan warning */}
      {orphans && orphans.total > 0 && (
        <OrphanWarning
          orphans={orphans}
          onCleaned={() => setOrphans({ ...orphans, total: 0, dayProgress: [], checklists: [], dayNotes: [], phaseNotes: [], resources: [] })}
        />
      )}

      {/* Progress */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Progress
        </h2>
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{doneDays}</span>
              /{totalDays} days done
              {skippedDays > 0 && <span className="text-gray-400 dark:text-gray-600"> · {skippedDays} skipped</span>}
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-400 dark:text-gray-500">
          {inProgressDays > 0 && (
            <span className="text-blue-500 dark:text-blue-400 font-medium">{inProgressDays} in progress</span>
          )}
          {phasesStarted > 0 && <span>{phasesStarted} phase{phasesStarted !== 1 ? 's' : ''} started</span>}
        </div>
      </section>

      {/* Continue */}
      {currentDay && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Continue
          </h2>
          <Link
            to={`/phase/${currentDay.phase.id}/week/${currentDay.week.number}/day/${currentDay.day.id.split('/').pop()}`}
            className="block p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">
                  Phase {currentDay.phase.number} · Week {currentDay.week.number}
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {currentDay.day.heading}
                </p>
                {currentDay.day.timeBudget && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{currentDay.day.timeBudget}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {progress.days[currentDay.day.id]?.status === 'in_progress' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
                    in progress
                  </span>
                )}
                <span className="text-blue-400 dark:text-blue-500 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Recent Notes
          </h2>
          <ul className="space-y-2">
            {recentNotes.map((note) => (
              <li key={`${note.type}:${note.id}`}>
                <Link
                  to={note.url}
                  className="block p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{note.label}</p>
                    <span className="text-xs text-gray-400 dark:text-gray-600 shrink-0">{timeAgo(note.updated_at)}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{note.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phase list */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
          Phases
        </h2>
        <ul className="space-y-2">
          {phases.map((phase) => {
            const phaseDayIds = phase.weeks.flatMap((w) => w.days.map((d) => d.id));
            const phaseTotal = phaseDayIds.length;
            const phaseDone = phaseDayIds.filter((id) => progress.days[id]?.status === 'done').length;
            const phaseInProgress = phaseDayIds.filter((id) => progress.days[id]?.status === 'in_progress').length;
            const allDone = phaseTotal > 0 && phaseDone === phaseTotal;
            const phasePct = phaseTotal > 0 ? (phaseDone / phaseTotal) * 100 : 0;

            return (
              <li key={phase.id}>
                <Link
                  to={`/phase/${phase.id}`}
                  className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium shrink-0">
                        Phase {phase.number}
                      </span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {phase.title}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {phaseInProgress > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      )}
                      {allDone ? (
                        <span className="text-green-500 text-xs">✓</span>
                      ) : phaseDone > 0 ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{phaseDone}/{phaseTotal}</span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">{phaseTotal}d</span>
                      )}
                    </div>
                  </div>
                  {(phaseDone > 0 || phaseInProgress > 0) && (
                    <div className="h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${allDone ? 'bg-green-500' : 'bg-blue-400'}`}
                        style={{ width: `${phasePct}%` }}
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function AppInner() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const toggleHelp = useCallback(() => setShowHelp((v) => !v), []);

  useEffect(() => {
    Promise.all([fetchPlan(), fetchProgress()])
      .then(([planData, progressData]) => {
        setPlan(planData);
        setProgress(progressData);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  // Global keyboard shortcuts: j/k navigation, ? help
  useGlobalKeyboard(plan, toggleHelp);

  const emptyProgress: ProgressResponse = { days: {}, checklists: {}, resources: {} };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-80 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 overflow-hidden flex flex-col">
        {loading && (
          <p className="p-4 text-sm text-gray-400">Loading plan…</p>
        )}
        {error && (
          <p className="p-4 text-sm text-red-500">Error: {error}</p>
        )}
        {plan && (
          <Sidebar
            phases={plan.phases}
            progress={progress ?? emptyProgress}
            onShowHelp={toggleHelp}
          />
        )}
      </aside>

      {/* Main content pane */}
      <main className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading…</p>
          </div>
        )}
        {error && (
          <div className="p-8">
            <p className="text-red-500">Failed to load plan: {error}</p>
          </div>
        )}
        {plan && progress && (
          <PlanContext.Provider value={plan}>
            <ProgressProvider initialProgress={progress}>
              <Routes>
                <Route path="/" element={<Dashboard plan={plan} />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/phase/:phaseId" element={<PhaseView />} />
                <Route path="/phase/:phaseId/mastery" element={<MasteryGate />} />
                <Route path="/phase/:phaseId/resources" element={<ResourcesPanel />} />
                <Route
                  path="/phase/:phaseId/week/:weekN/day/:daySlug"
                  element={<DayView />}
                />
              </Routes>
            </ProgressProvider>
          </PlanContext.Provider>
        )}
      </main>

      {/* Keyboard help overlay */}
      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
