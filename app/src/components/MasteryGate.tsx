import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../PlanContext';
import { useProgress } from '../ProgressContext';
import Markdown from './Markdown';

export default function MasteryGate() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const plan = usePlan();
  const { progress, setChecklistItem } = useProgress();

  if (!plan) return null;

  const phase = plan.phases.find((p) => p.id === phaseId);
  if (!phase) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400">
        Phase <code>{phaseId}</code> not found.
      </div>
    );
  }

  const { masteryGate } = phase;

  const total = masteryGate.checklist.length;
  const checked = masteryGate.checklist.filter(
    (item) => progress.checklists[item.id]?.checked
  ).length;
  const allPassed = total > 0 && checked === total;

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex gap-1.5 items-center">
        <Link to={`/phase/${phase.id}`} className="hover:text-gray-700 dark:hover:text-gray-200">
          Phase {phase.number}: {phase.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">Mastery gate</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Mastery Gate — Phase {phase.number}
        </h1>
        {allPassed && (
          <span className="text-sm px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            ✓ Passed
          </span>
        )}
      </div>

      {total > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {checked}/{total} items checked
          {allPassed && ' — you are ready to move on'}
        </p>
      )}

      {masteryGate.checklist.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {masteryGate.checklist.map((item) => {
            const isChecked = progress.checklists[item.id]?.checked ?? false;
            return (
              <label
                key={item.id}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                  isChecked
                    ? 'bg-green-50/60 dark:bg-green-900/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setChecklistItem(item.id, e.target.checked)}
                  className="mt-0.5 shrink-0 accent-green-600"
                />
                <span
                  className={`text-sm ${
                    isChecked
                      ? 'text-gray-400 dark:text-gray-500 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.text}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {masteryGate.bodyMarkdown && (
        <Markdown>{masteryGate.bodyMarkdown}</Markdown>
      )}

      {masteryGate.checklist.length === 0 && !masteryGate.bodyMarkdown && (
        <p className="text-gray-400 italic">No mastery gate content for this phase.</p>
      )}
    </div>
  );
}
