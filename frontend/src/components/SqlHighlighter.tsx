import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface SqlHighlighterProps {
  sql: string;
  className?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
}

export const highlightSqlTokens = (sql: string): string => {
  if (!sql) return '';

  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE',
    'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
    'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
    'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
    'IS', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'DISTINCT', 'ASC', 'DESC', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX',
    'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'VALUES', 'WITH', 'RETURNING'
  ];

  const functions = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CONCAT', 'ROUND',
    'NOW', 'CURRENT_TIMESTAMP', 'DATE', 'SUBSTRING', 'LOWER', 'UPPER',
    'CAST', 'EXTRACT', 'TRIM', 'LENGTH', 'JSON_EXTRACT'
  ];

  // Escape HTML characters first
  let html = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight comments (-- or /* */)
  html = html.replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sql-comment">$1</span>');

  // Highlight strings ('...' or "...")
  html = html.replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, '<span class="sql-string">$&</span>');

  // Highlight numbers
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

  // Highlight functions (function followed by `(`)
  functions.forEach((fn) => {
    const regex = new RegExp(`\\b(${fn})\\b(?=\\s*\\()`, 'gi');
    html = html.replace(regex, '<span class="sql-function">$1</span>');
  });

  // Highlight keywords
  // Sort by length desc so multi-word keywords match first
  keywords
    .slice()
    .sort((a, b) => b.length - a.length)
    .forEach((kw) => {
      const regex = new RegExp(`(?<![a-zA-Z0-9_])(${kw})(?![a-zA-Z0-9_])`, 'gi');
      html = html.replace(regex, '<span class="sql-keyword">$1</span>');
    });

  return html;
};

export const SqlHighlighter: React.FC<SqlHighlighterProps> = ({
  sql,
  className = '',
  showLineNumbers = true,
  maxHeight = 'max-h-96',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text: ', e);
    }
  };

  const lines = sql.trim().split('\n');

  return (
    <div className={`relative group rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden font-mono text-sm ${className}`}>
      {/* Top Header bar with Copy Action */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-xs text-slate-400">
        <span className="font-sans font-medium text-slate-400">SQL Query</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
          title="Copy SQL to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div className={`p-4 overflow-auto ${maxHeight} text-slate-200 leading-relaxed font-mono`}>
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="w-8 select-none text-right pr-4 text-slate-600 text-xs font-mono align-top pt-0.5">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre font-mono text-xs sm:text-sm">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightSqlTokens(line) || '&nbsp;',
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre font-mono text-xs sm:text-sm">
            <code
              dangerouslySetInnerHTML={{
                __html: highlightSqlTokens(sql),
              }}
            />
          </pre>
        )}
      </div>
    </div>
  );
};
