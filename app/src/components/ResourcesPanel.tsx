import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../PlanContext';
import { useProgress } from '../ProgressContext';
import type { ResourceGroup, ResourceStatus } from '../../shared/types';

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

// Status cycle: unread → reading → done → skip → unread
const STATUS_CYCLE: ResourceStatus[] = ['unread', 'reading', 'done', 'skip'];

const STATUS_LABELS: Record<ResourceStatus, string> = {
  unread: 'Unread',
  reading: 'Reading',
  done: 'Done',
  skip: 'Skip',
};

const STATUS_STYLES: Record<ResourceStatus, string> = {
  unread: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
  reading: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50',
  skip: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 line-through',
};

function nextStatus(current: ResourceStatus): ResourceStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

export default function ResourcesPanel() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const plan = usePlan();
  const { progress, setResourceStatus } = useProgress();

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
  const doneCount = phase.resources.reduce(
    (sum, g) => sum + g.items.filter((item) => progress.resources[item.url]?.status === 'done').length,
    0
  );
  const skipCount = phase.resources.reduce(
    (sum, g) => sum + g.items.filter((item) => progress.resources[item.url]?.status === 'skip').length,
    0
  );

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
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {totalLinks} links across {phase.resources.length} categories
      </p>
      {(doneCount > 0 || skipCount > 0) && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          <span className="text-green-600 dark:text-green-400 font-medium">{doneCount} done</span>
          {skipCount > 0 && (
            <>, <span className="font-medium">{skipCount} skipped</span></>
          )}
          {' '}· {totalLinks - doneCount - skipCount} remaining
        </p>
      )}
      {doneCount === 0 && skipCount === 0 && <div className="mb-8" />}

      {phase.resources.length === 0 && (
        <p className="text-gray-400 italic">No resources listed for this phase.</p>
      )}

      <div className="space-y-8">
        {phase.resources.map((group) => {
          const groupDone = group.items.filter(
            (item) => progress.resources[item.url]?.status === 'done'
          ).length;
          const groupSkip = group.items.filter(
            (item) => progress.resources[item.url]?.status === 'skip'
          ).length;
          const groupTotal = group.items.length;

          return (
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
                {groupDone > 0 && (
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                    {groupDone}/{groupTotal - groupSkip} done
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => {
                  const status: ResourceStatus = progress.resources[item.url]?.status ?? 'unread';
                  const isDone = status === 'done';
                  const isSkip = status === 'skip';

                  return (
                    <li
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isDone
                          ? 'border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-900/10'
                          : isSkip
                          ? 'border-gray-200 dark:border-gray-800 opacity-50'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium hover:underline block truncate ${
                            isDone
                              ? 'text-green-700 dark:text-green-400'
                              : isSkip
                              ? 'text-gray-400 dark:text-gray-500 line-through'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {item.label}
                        </a>
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate block mt-0.5">
                          {item.url}
                        </span>
                      </div>
                      <button
                        onClick={() => setResourceStatus(item.url, nextStatus(status))}
                        title={`Status: ${STATUS_LABELS[status]} — click to advance`}
                        className={`text-xs px-2 py-1 rounded font-medium shrink-0 mt-0.5 transition-colors cursor-pointer ${STATUS_STYLES[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        Click a status badge to cycle: Unread → Reading → Done → Skip
      </p>
    </div>
  );
}
