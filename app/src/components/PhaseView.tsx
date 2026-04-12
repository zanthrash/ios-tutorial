import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../PlanContext';
import Markdown from './Markdown';
import NotesEditor from './NotesEditor';

export default function PhaseView() {
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

  const totalDays = phase.weeks.reduce((sum, w) => sum + w.days.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">
          Phase {phase.number}
        </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
          {phase.title}
        </h1>
        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
          {phase.duration && <span>{phase.duration}</span>}
          <span>{phase.weeks.length} weeks</span>
          <span>{totalDays} days</span>
        </div>
      </div>

      {/* Quick nav */}
      <div className="flex gap-3 mb-8">
        <Link
          to={`/phase/${phase.id}/mastery`}
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Mastery gate
        </Link>
        <Link
          to={`/phase/${phase.id}/resources`}
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Resources
        </Link>
      </div>

      {/* Phase notes */}
      <section className="mb-8">
        <NotesEditor scope="phase" scopeId={phase.id} />
      </section>

      {/* Week overview */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">Weeks</h2>
        <ul className="space-y-2">
          {phase.weeks.map((week) => (
            <li key={week.id} className="flex items-start gap-3">
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5 w-12 shrink-0">
                Wk {week.number}
              </span>
              <div>
                <span className="text-gray-800 dark:text-gray-200 font-medium">{week.title}</span>
                {week.goal && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{week.goal}</p>
                )}
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {week.days.map((day) => {
                    const slug = day.id.split('/').pop()!;
                    return (
                      <li key={day.id}>
                        <Link
                          to={`/phase/${phase.id}/week/${week.number}/day/${slug}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {day.heading}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* What you'll have */}
      {phase.whatYoullHave && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
            What you'll have at the end
          </h2>
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-5 py-4">
            <Markdown>{phase.whatYoullHave}</Markdown>
          </div>
        </section>
      )}

      {/* Translating to your own app */}
      {phase.translatingToYourOwnApp && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
            Translating to your own app
          </h2>
          <Markdown>{phase.translatingToYourOwnApp}</Markdown>
        </section>
      )}

      {/* What you will NOT do */}
      {phase.willNotDo && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
            What you will NOT do
          </h2>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-5 py-4">
            <Markdown>{phase.willNotDo}</Markdown>
          </div>
        </section>
      )}

      {/* If you get stuck */}
      {phase.ifStuck && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
            If you get stuck
          </h2>
          <Markdown>{phase.ifStuck}</Markdown>
        </section>
      )}

      {/* When you're done */}
      {phase.whenDone && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
            When you're done
          </h2>
          <Markdown>{phase.whenDone}</Markdown>
        </section>
      )}
    </div>
  );
}
