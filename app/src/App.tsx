import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { PlanContext } from './PlanContext';
import { ProgressProvider } from './ProgressContext';
import Sidebar from './components/Sidebar';
import DayView from './components/DayView';
import PhaseView from './components/PhaseView';
import MasteryGate from './components/MasteryGate';
import ResourcesPanel from './components/ResourcesPanel';
import SearchResults from './components/SearchResults';
import KeyboardHelp from './components/KeyboardHelp';
import OrphanWarning from './components/OrphanWarning';
import { useGlobalKeyboard } from './hooks/useGlobalKeyboard';
import { fetchPlan, fetchProgress, fetchOrphans } from './api';
import type { PlanResponse, ProgressResponse, OrphansResponse } from '../shared/types';

function Dashboard({ plan }: { plan: PlanResponse }) {
  const [orphans, setOrphans] = useState<OrphansResponse | null>(null);

  useEffect(() => {
    fetchOrphans().then(setOrphans).catch(() => {/* non-fatal */});
  }, []);

  const totalPhases = plan.phases.length;
  const totalDays = plan.phases.reduce(
    (sum, p) => sum + p.weeks.reduce((s, w) => s + w.days.length, 0),
    0
  );

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
        iOS Mastery Curriculum
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {totalPhases} phases · {totalDays} days · 12–18 month program
      </p>

      {orphans && orphans.total > 0 && (
        <OrphanWarning orphans={orphans} onCleaned={() => setOrphans({ ...orphans, total: 0, dayProgress: [], checklists: [], dayNotes: [], phaseNotes: [], resources: [] })} />
      )}

      <ul className="space-y-3">
        {plan.phases.map((phase) => {
          const days = phase.weeks.reduce((s, w) => s + w.days.length, 0);
          return (
            <li key={phase.id}>
              <Link
                to={`/phase/${phase.id}`}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                      Phase {phase.number}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {phase.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {phase.weeks.length}w · {days}d
                    </p>
                    {phase.duration && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{phase.duration}</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
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
