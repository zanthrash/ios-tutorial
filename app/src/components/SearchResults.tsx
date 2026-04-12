import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchContent } from '../api';
import type { SearchResult } from '../../shared/types';

function typeBadge(type: SearchResult['type']) {
  if (type === 'day-note') {
    return (
      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
        day note
      </span>
    );
  }
  if (type === 'phase-note') {
    return (
      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
        phase note
      </span>
    );
  }
  return (
    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      plan
    </span>
  );
}

function highlightQuery(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const qi = text.toLowerCase().indexOf(q.toLowerCase());
  if (qi === -1) return text;
  return (
    <>
      {text.slice(0, qi)}
      <mark className="bg-yellow-200 dark:bg-yellow-800/60 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5">
        {text.slice(qi, qi + q.length)}
      </mark>
      {text.slice(qi + q.length)}
    </>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    searchContent(q)
      .then((data) => {
        if (ac.signal.aborted) return;
        setResults(data.results);
        setLoading(false);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setError(String(err));
        setLoading(false);
      });

    return () => ac.abort();
  }, [q]);

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">Search</h1>

      {q.length >= 2 && !loading && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          {results.length === 0
            ? `No results for "${q}"`
            : `${results.length} result${results.length === 1 ? '' : 's'} for "${q}"`}
        </p>
      )}

      {q.length < 2 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Type at least 2 characters and press Enter to search.
        </p>
      )}

      {loading && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Searching…</p>
      )}

      {error && (
        <p className="text-sm text-red-500 mb-6">Error: {error}</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r, i) => (
            <li key={`${r.type}:${r.id}:${i}`}>
              <Link
                to={r.url}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  {typeBadge(r.type)}
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                    {highlightQuery(r.label, q)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-mono">
                  {highlightQuery(r.snippet, q)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
