import React, { useState, useMemo } from 'react';
import {
  Clock,
  Database,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';
import { ExecuteResponse } from '../types';

interface ResultsTableProps {
  result: ExecuteResponse | null;
  loading?: boolean;
  className?: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  result,
  loading = false,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Extract columns
  const columns: string[] = useMemo(() => {
    if (!result) return [];
    if (result.columns && result.columns.length > 0) {
      return result.columns;
    }
    if (result.rows && result.rows.length > 0) {
      return Object.keys(result.rows[0]);
    }
    return [];
  }, [result]);

  // Filter and sort rows
  const processedRows = useMemo(() => {
    if (!result?.rows) return [];
    let rows = [...result.rows];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '')
            .toLowerCase()
            .includes(term)
        )
      );
    }

    // Sort
    if (sortColumn) {
      rows.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return rows;
  }, [result?.rows, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    if (!result?.rows || result.rows.length === 0) return;
    const headers = columns.join(',');
    const rows = result.rows.map((row) =>
      columns
        .map((c) => {
          const val = row[c];
          if (val === null || val === undefined) return '""';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (!result?.rows) return;
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result.rows, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `query_results_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={`p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 ${className}`}>
        <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 animate-spin">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-white">Executing Query...</h4>
          <p className="text-xs text-slate-400">Fetching rows and measuring execution latency.</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={`p-10 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center text-slate-500 ${className}`}>
        <Database className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
        <p className="text-sm font-medium">No execution results to display yet.</p>
        <p className="text-xs text-slate-600 mt-1">
          Select or edit a query above and click <span className="text-brand-400">Execute</span>.
        </p>
      </div>
    );
  }

  if (!result.success && result.error) {
    return (
      <div className={`p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 ${className}`}>
        <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>Something went wrong</span>
        </div>
        <p className="text-sm">We couldn’t process your request. Please check your query and try again.</p>
        <p className="font-mono text-xs bg-amber-100 p-3 rounded-xl border border-amber-200 whitespace-pre-wrap">
          {result.error}
        </p>
      </div>
    );
  }

  const isWriteOperation = result.affectedRows !== undefined;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col ${className}`}>
      {/* Execution Summary Bar */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Execution Succeeded
          </span>

          <span className="flex items-center gap-1 text-slate-400 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {result.executionTimeMs ?? 0} ms
          </span>

          {isWriteOperation ? (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
              Affected Rows: <strong className="text-white">{result.affectedRows}</strong>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-semibold">
              Total Rows: <strong className="text-white">{result.rowCount ?? result.rows?.length ?? 0}</strong>
              {(result.rowCount ?? 0) >= 500 && (
                <span className="text-[10px] text-amber-400 ml-1">(capped at 500)</span>
              )}
            </span>
          )}
        </div>

        {/* Action buttons (Search & Exports) */}
        {!isWriteOperation && (result.rows?.length ?? 0) > 0 && (
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter result rows..."
                className="pl-7 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
              title="Export as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportJSON}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
              title="Export as JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Mutation result banner or Table */}
      {isWriteOperation ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Database Mutation Complete</h4>
          <p className="text-xs text-slate-400">
            Successfully committed changes affecting <strong className="text-emerald-400">{result.affectedRows}</strong> row(s).
          </p>
        </div>
      ) : columns.length === 0 || paginatedRows.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          {searchTerm ? 'No rows match the search query.' : 'Query returned 0 rows.'}
        </div>
      ) : (
        <>
          {/* Scrollable Data Table */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-slate-600 text-center">#</th>
                  {columns.map((col) => {
                    const isSorted = sortColumn === col;
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="py-2.5 px-4 font-semibold text-slate-300 hover:text-brand-300 cursor-pointer select-none whitespace-nowrap"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span>{col}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-brand-400" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-brand-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-50" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {paginatedRows.map((row, rowIdx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + rowIdx + 1;
                  return (
                    <tr
                      key={rowIdx}
                      className="hover:bg-slate-850/60 transition-colors group"
                    >
                      <td className="py-2 px-3 text-center text-slate-600 text-[11px]">
                        {absoluteIndex}
                      </td>
                      {columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        const isBoolean = typeof val === 'boolean';

                        return (
                          <td
                            key={col}
                            className="py-2 px-4 text-slate-200 whitespace-nowrap max-w-xs truncate"
                            title={String(val ?? '')}
                          >
                            {isNull ? (
                              <span className="text-slate-600 italic">NULL</span>
                            ) : isBoolean ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  val ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {val ? 'TRUE' : 'FALSE'}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {Math.min((currentPage - 1) * pageSize + 1, processedRows.length)} to{' '}
                {Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length} rows
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
