import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDayNote, putDayNote, fetchPhaseNote, putPhaseNote } from '../api';
import Markdown from './Markdown';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  scope: 'day' | 'phase';
  scopeId: string;
};

export default function NotesEditor({ scope, scopeId }: Props) {
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loaded, setLoaded] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note when scope/scopeId changes
  useEffect(() => {
    setLoaded(false);
    setBody('');
    setSaveState('idle');
    setPreview(false);

    const fetcher = scope === 'day' ? fetchDayNote : fetchPhaseNote;
    fetcher(scopeId)
      .then((note) => {
        setBody(note?.body ?? '');
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [scope, scopeId]);

  const save = useCallback(
    (text: string) => {
      setSaveState('saving');
      const saver = scope === 'day' ? putDayNote : putPhaseNote;
      saver(scopeId, text)
        .then(() => {
          setSaveState('saved');
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
        })
        .catch(() => setSaveState('error'));
    },
    [scope, scopeId],
  );

  const handleChange = (text: string) => {
    setBody(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 800);
  };

  if (!loaded) {
    return <p className="text-sm text-gray-400 dark:text-gray-600 italic">Loading notes…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</h3>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-green-600 dark:text-green-400">Saved</span>
          )}
          {saveState === 'error' && (
            <span className="text-xs text-red-500">Save failed</span>
          )}
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-24 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-900">
          {body ? (
            <div className="text-gray-800 dark:text-gray-200 text-sm">
              <Markdown>{body}</Markdown>
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-600 italic text-sm">No notes yet.</p>
          )}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add notes… (markdown supported)"
          rows={6}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      )}
    </div>
  );
}
