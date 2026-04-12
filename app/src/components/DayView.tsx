import { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { usePlan } from '../PlanContext';
import { useProgress } from '../ProgressContext';
import Markdown from './Markdown';
import type { DayStatus, ChecklistItem } from '../../shared/types';

const STATUS_LABELS: Record<DayStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
};

const STATUS_COLORS: Record<DayStatus, string> = {
  todo: 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600',
  in_progress: 'text-blue-600 dark:text-blue-400 border-blue-400 dark:border-blue-600',
  done: 'text-green-600 dark:text-green-400 border-green-400 dark:border-green-600',
  skipped: 'text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600',
};

export default function DayView() {
  const { phaseId, weekN, daySlug } = useParams<{
    phaseId: string;
    weekN: string;
    daySlug: string;
  }>();
  const plan = usePlan();
  const { progress, setDayStatus, setChecklistItem } = useProgress();

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

  const dayProgress = progress.days[day.id];
  const status: DayStatus = dayProgress?.status ?? 'todo';

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

      {/* Heading + status row */}
      <div className="flex items-start gap-4 mb-1">
        <h1 className="flex-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
          {day.heading}
        </h1>
        <select
          value={status}
          onChange={(e) => setDayStatus(day.id, e.target.value as DayStatus)}
          className={`shrink-0 mt-1 text-xs font-medium rounded-md border px-2 py-1 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_COLORS[status]}`}
          aria-label="Day status"
        >
          {(Object.keys(STATUS_LABELS) as DayStatus[]).map((s) => (
            <option key={s} value={s} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

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

      {/* Day body with interactive checklists */}
      {day.bodyMarkdown ? (
        <DayMarkdown
          markdown={day.bodyMarkdown}
          checklistItems={day.inlineChecklistItems}
          checklistProgress={progress.checklists}
          onChecklistChange={setChecklistItem}
        />
      ) : (
        <p className="text-gray-400 italic">No content for this day.</p>
      )}

      {/* Checklist summary if there are items */}
      {day.inlineChecklistItems.length > 0 && (
        <div className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          {day.inlineChecklistItems.filter((item) => progress.checklists[item.id]?.checked).length}
          /{day.inlineChecklistItems.length} tasks checked
        </div>
      )}

      {/* Day navigation */}
      <DayNav phase={phase} week={week} day={day} />
    </div>
  );
}

// Renders day markdown with interactive checkboxes wired to progress state.
function DayMarkdown({
  markdown,
  checklistItems,
  checklistProgress,
  onChecklistChange,
}: {
  markdown: string;
  checklistItems: ChecklistItem[];
  checklistProgress: Record<string, { checked: boolean }>;
  onChecklistChange: (itemId: string, checked: boolean) => void;
}) {
  // Counter is reset each render to map checkbox positions to item IDs.
  const indexRef = useRef(0);
  indexRef.current = 0;

  return (
    <div className="md-body text-gray-800 dark:text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className: cls, children, ...props }) {
            const match = /language-(\w+)/.exec(cls || '');
            const code = String(children).replace(/\n$/, '');
            if (match && code.includes('\n')) {
              // Delegate to Markdown's CodeBlock via a wrapper
              return <FallbackCode code={code} lang={match[1]} />;
            }
            return (
              <code
                className="bg-gray-100 dark:bg-gray-800 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-[0.85em] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-3">
                {children}
              </blockquote>
            );
          },
          input({ type, ...props }) {
            if (type === 'checkbox') {
              const index = indexRef.current++;
              const item = checklistItems[index];
              if (!item) {
                return <input type="checkbox" readOnly {...props} />;
              }
              const isChecked = checklistProgress[item.id]?.checked ?? false;
              return (
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => onChecklistChange(item.id, e.target.checked)}
                  className="mr-2 mt-0.5 cursor-pointer accent-blue-500"
                />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

// Simple code block fallback (reuses pre-warm logic via Markdown for now).
function FallbackCode({ code, lang }: { code: string; lang: string }) {
  // Wrap in a Markdown render just for the code block — pull the shiki path.
  // This is slightly redundant but avoids duplicating the Shiki singleton.
  return <Markdown>{`\`\`\`${lang}\n${code}\n\`\`\``}</Markdown>;
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
