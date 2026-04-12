import { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string[]; description: string }> = [
  { keys: ['j'], description: 'Next day' },
  { keys: ['k'], description: 'Previous day' },
  { keys: ['Space'], description: 'Cycle day status' },
  { keys: ['n'], description: 'Focus notes editor' },
  { keys: ['⌘', 'K'], description: 'Focus search' },
  { keys: ['?'], description: 'Toggle this help' },
  { keys: ['Esc'], description: 'Close / blur' },
];

export default function KeyboardHelp({ onClose }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 w-80 max-w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <dl className="space-y-2.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <dt className="text-xs text-gray-500 dark:text-gray-400">{description}</dt>
              <dd className="flex items-center gap-1 shrink-0">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 min-w-[1.25rem] leading-none"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 text-[10px] text-gray-400 dark:text-gray-600 text-center">
          Press <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">?</kbd> or{' '}
          <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
