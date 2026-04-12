import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../PlanContext';
import Markdown from './Markdown';

export default function DayView() {
  const { phaseId, weekN, daySlug } = useParams<{
    phaseId: string;
    weekN: string;
    daySlug: string;
  }>();
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

  const week = phase.weeks.find((w) => String(w.number) === weekN);
  if (!week) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400">
        Week {weekN} not found in {phase.title}.
      </div>
    );
  }

  const day = week.days.find((d) => d.id.endsWith(`/${daySlug}`));
  if (!day) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400">
        Day <code>{daySlug}</code> not found in Week {weekN}.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex gap-1.5 items-center flex-wrap">
        <Link to={`/phase/${phase.id}`} className="hover:text-gray-700 dark:hover:text-gray-200">
          Phase {phase.number}
        </Link>
        <span>/</span>
        <span>Week {week.number} — {week.title}</span>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">{day.heading}</span>
      </nav>

      {/* Heading */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
        {day.heading}
      </h1>
      {day.timeBudget && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Time budget: {day.timeBudget}
        </p>
      )}

      {/* Week goal if this is the first day */}
      {week.goal && week.days[0] === day && (
        <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Week goal: {week.goal}
          </p>
        </div>
      )}

      {/* Day body */}
      {day.bodyMarkdown ? (
        <Markdown>{day.bodyMarkdown}</Markdown>
      ) : (
        <p className="text-gray-400 italic">No content for this day.</p>
      )}

      {/* Day navigation */}
      <DayNav phase={phase} week={week} day={day} />
    </div>
  );
}

function DayNav({
  phase,
  week,
  day,
}: {
  phase: ReturnType<typeof usePlan>['phases'][number];
  week: ReturnType<typeof usePlan>['phases'][number]['weeks'][number];
  day: ReturnType<typeof usePlan>['phases'][number]['weeks'][number]['days'][number];
}) {
  // Collect all days across all weeks in this phase in order.
  const allDays: Array<{
    day: typeof day;
    week: typeof week;
  }> = [];
  for (const w of phase.weeks) {
    for (const d of w.days) {
      allDays.push({ day: d, week: w });
    }
  }

  const currentIndex = allDays.findIndex((entry) => entry.day.id === day.id);
  const prev = currentIndex > 0 ? allDays[currentIndex - 1] : null;
  const next = currentIndex < allDays.length - 1 ? allDays[currentIndex + 1] : null;

  function dayUrl(w: typeof week, d: typeof day) {
    const slug = d.id.split('/').pop()!;
    return `/phase/${phase.id}/week/${w.number}/day/${slug}`;
  }

  return (
    <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-4">
      <div>
        {prev && (
          <Link
            to={dayUrl(prev.week, prev.day)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            ← {prev.day.heading}
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            to={dayUrl(next.week, next.day)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            {next.day.heading} →
          </Link>
        )}
      </div>
    </div>
  );
}
