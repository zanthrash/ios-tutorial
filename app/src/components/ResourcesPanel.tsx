import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../PlanContext';
import type { ResourceGroup } from '../../shared/types';

const CATEGORY_LABELS: Record<ResourceGroup['category'], string> = {
  primary: 'Primary resources',
  'videos-must': 'Must-watch videos',
  'videos-optional': 'Optional videos',
  books: 'Books',
  'free-alt': 'Free alternatives',
  tools: 'Tools',
  'apple-dev': 'Apple Developer',
};

const CATEGORY_COLORS: Record<ResourceGroup['category'], string> = {
  primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'videos-must': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'videos-optional': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  books: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'free-alt': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  tools: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'apple-dev': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
};

export default function ResourcesPanel() {
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

  const totalLinks = phase.resources.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex gap-1.5 items-center">
        <Link to={`/phase/${phase.id}`} className="hover:text-gray-700 dark:hover:text-gray-200">
          Phase {phase.number}: {phase.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">Resources</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
        Resources — Phase {phase.number}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {totalLinks} links across {phase.resources.length} categories
      </p>

      {phase.resources.length === 0 && (
        <p className="text-gray-400 italic">No resources listed for this phase.</p>
      )}

      <div className="space-y-8">
        {phase.resources.map((group) => (
          <section key={group.label}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {group.label}
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[group.category]}`}
              >
                {CATEGORY_LABELS[group.category]}
              </span>
            </div>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline block truncate"
                    >
                      {item.label}
                    </a>
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate block mt-0.5">
                      {item.url}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                    unread
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        Resource status tracking (read/done/skip) comes in Phase 5.
      </p>
    </div>
  );
}
