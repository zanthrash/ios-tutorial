import { useState } from 'react';
import type { OrphansResponse } from '../../shared/types';
import { deleteOrphans } from '../api';

interface Props {
  orphans: OrphansResponse;
  onCleaned: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  'day-progress': 'Day progress',
  'checklist': 'Checklist item',
  'day-note': 'Day note',
  'phase-note': 'Phase note',
  'resource': 'Resource status',
};

export default function OrphanWarning({ orphans, onCleaned }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allOrphans = [
    ...orphans.dayProgress,
    ...orphans.checklists,
    ...orphans.dayNotes,
    ...orphans.phaseNotes,
    ...orphans.resources,
  ];

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      await deleteOrphans();
      onCleaned();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <span className="text-amber-500 dark:text-amber-400 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {orphans.total} unreachable progress {orphans.total === 1 ? 'record' : 'records'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              These DB rows no longer match any ID in the current markdown files — likely from renamed or deleted headings.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
          >
            {expanded ? 'Hide' : 'Show details'}
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={deleting}
            className="text-xs px-3 py-1.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete all'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800 space-y-1 max-h-48 overflow-y-auto">
          {allOrphans.map((o) => (
            <div
              key={`${o.type}:${o.id}`}
              className="flex items-baseline gap-2 text-xs"
            >
              <span className="text-amber-600 dark:text-amber-500 shrink-0 font-medium w-28">
                {TYPE_LABELS[o.type] ?? o.type}
              </span>
              <code className="text-amber-800 dark:text-amber-300 truncate flex-1 font-mono text-[11px]">
                {o.id}
              </code>
              {o.detail && (
                <span className="text-amber-500 dark:text-amber-600 shrink-0">
                  {o.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
