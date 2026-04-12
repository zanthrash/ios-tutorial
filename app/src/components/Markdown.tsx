import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useState, useEffect } from 'react';
import type { Highlighter } from 'shiki';

// Singleton highlighter — loaded once, shared across all Markdown instances.
let _hl: Highlighter | null = null;
let _hlPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!_hlPromise) {
    _hlPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: [
          'swift', 'objc', 'typescript', 'javascript',
          'bash', 'shell', 'json', 'yaml', 'markdown',
          'html', 'css', 'xml', 'plaintext',
        ],
      })
    ).then((hl) => {
      _hl = hl;
      return hl;
    });
  }
  return _hlPromise;
}

// Pre-warm the highlighter when the module loads.
getHighlighter();

interface CodeBlockProps {
  code: string;
  lang: string;
}

function CodeBlock({ code, lang }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(() => {
    if (!_hl) return null;
    try {
      return _hl.codeToHtml(code, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      });
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (html) return;
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      try {
        setHtml(
          hl.codeToHtml(code, {
            lang,
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          })
        );
      } catch {
        // Unsupported language — leave as plain
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang, html]);

  if (html) {
    return (
      <div
        className="not-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <pre className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 overflow-x-auto text-sm font-mono">
      <code>{code}</code>
    </pre>
  );
}

interface MarkdownProps {
  children: string;
  className?: string;
}

export default function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={`md-body text-gray-800 dark:text-gray-200 ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Strip the default <pre> wrapper — CodeBlock renders its own.
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className: cls, children, ...props }) {
            const match = /language-(\w+)/.exec(cls || '');
            const code = String(children).replace(/\n$/, '');
            if (match && code.includes('\n')) {
              return <CodeBlock code={code} lang={match[1]} />;
            }
            // Inline code
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
        }}
      />
    </div>
  );
}
