import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../PlanContext';
import Markdown from './Markdown';

export default function MasteryGate() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const plan = usePlan();

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

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
        Mastery Gate — Phase {phase.number}
      </h1>

      {masteryGate.checklist.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {masteryGate.checklist.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 px-4 py-3 cursor-not-allowed opacity-75"
            >
              <input
                type="checkbox"
                disabled
                className="mt-0.5 shrink-0"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
            </label>
          ))}
        </div>
      )}

      {masteryGate.bodyMarkdown && (
        <Markdown>{masteryGate.bodyMarkdown}</Markdown>
      )}

      {masteryGate.checklist.length === 0 && !masteryGate.bodyMarkdown && (
        <p className="text-gray-400 italic">No mastery gate content for this phase.</p>
      )}

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        Progress tracking for mastery gate items comes in Phase 3.
      </p>
    </div>
  );
}
