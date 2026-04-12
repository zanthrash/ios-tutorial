import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K focuses the search input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
        <svg
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6.5" cy="6.5" r="4.5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search…"
        aria-label="Search notes and content"
        className="w-full pl-7 pr-10 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600"
      />
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-gray-300 dark:text-gray-600 text-[10px] font-mono">
          ⌘K
        </kbd>
      </div>
    </div>
  );
}
