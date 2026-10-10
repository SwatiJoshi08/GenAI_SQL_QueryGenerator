import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Database,
  RotateCcw,
  Sparkles,
  Terminal,
  Calendar,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { HistoryRecord, Dialect } from '../types';
import { SqlHighlighter } from '../components/SqlHighlighter';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dialectFilter, setDialectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<HistoryRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHistory({
        database_type: dialectFilter !== 'all' ? dialectFilter : undefined,
        execution_status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setHistoryList(res.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [dialectFilter, statusFilter]);

  const viewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const record = await api.getHistoryById(id);
      setSelectedItem(record);
    } catch (err: any) {
      alert(`Could not load record detail: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReuseInStudio = (record: HistoryRecord) => {
    const querySql =
      record.selected_query ||
      (Array.isArray(record.generated_query)
        ? record.generated_query[0]?.sql
        : typeof record.generated_query === 'string'
        ? record.generated_query
        : '');

    navigate('/studio', {
      state: {
        sql: querySql,
        dialect: record.database_type,
        prompt: record.prompt,
        historyId: record.id,
      },
    });
  };

  const handleReuseInGenerator = (record: HistoryRecord) => {
    navigate('/generator', {
      state: {
        prompt: record.prompt,
        dialect: record.database_type,
        autoRun: true,
      },
    });
  };

  const filteredHistory = historyList.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const promptMatch = item.prompt?.toLowerCase().includes(term);
    const queryMatch = item.selected_query?.toLowerCase().includes(term);
    const errorMatch = item.error_message?.toLowerCase().includes(term);
    return promptMatch || queryMatch || errorMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-brand-400" />
            Execution &amp; Generation History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, inspect, and reuse past queries, execution logs, and timing metrics.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl glass-panel flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by prompt, SQL query, or error message..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs">
            <Database className="w-3.5 h-3.5 text-brand-400" />
            <select
              value={dialectFilter}
              onChange={(e) => setDialectFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900">All Dialects</option>
              <option value="mysql" className="bg-slate-900">MySQL</option>
              <option value="postgres" className="bg-slate-900">PostgreSQL</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="success" className="bg-slate-900">Success</option>
              <option value="failed" className="bg-slate-900">Failed</option>
              <option value="pending" className="bg-slate-900">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* History List Table / Cards */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading execution history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-amber-50/60 border border-amber-200 rounded-2xl text-slate-600 text-xs space-y-2">
          <History className="w-8 h-8 mx-auto text-teal-400 opacity-70" />
          <p className="font-semibold text-slate-600">No history records found.</p>
          <p className="text-slate-600 mb-4">Execute or generate queries in the studio to record your history.</p>
          <img src="file:///C:/Users/DELL/.gemini/antigravity-ide/brain/1a2bcd8b-f470-48fb-9a00-ecd6d73a453d/empty_history_illustration_1791531230841.jpg" alt="Empty history illustration" className="mx-auto mt-4 w-48" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">ID</th>
                  <th className="py-3 px-4 w-28">Dialect</th>
                  <th className="py-3 px-4">Prompt / Requirement</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-24">Latency</th>
                  <th className="py-3 px-4 w-36">Timestamp</th>
                  <th className="py-3 px-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-850/60 transition-colors group cursor-pointer"
                    onClick={() => viewDetail(item.id)}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      #{item.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {item.database_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1 max-w-md">
                        <p className="font-medium text-slate-200 line-clamp-1">
                          {item.prompt || 'Direct Query Execution'}
                        </p>
                        {item.selected_query && (
                          <p className="font-mono text-[11px] text-slate-500 truncate">
                            {item.selected_query}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.execution_status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.execution_status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.execution_status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span className="capitalize">{item.execution_status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {item.execution_time_ms ? `${item.execution_time_ms} ms` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleReuseInStudio(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-medium flex items-center gap-1"
                          title="Open in SQL Studio"
                        >
                          <Terminal className="w-3 h-3 text-brand-400" />
                          <span className="hidden sm:inline">Studio</span>
                        </button>
                        <button
                          onClick={() => handleReuseInGenerator(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-medium flex items-center gap-1"
                          title="Re-run in Generator"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="hidden sm:inline">Regen</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            role="dialog"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    History Execution Detail
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      #{selectedItem.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono capitalize">
                    {selectedItem.database_type} engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Prompt */}
              {selectedItem.prompt && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Prompt:
                  </label>
                  <p className="text-sm text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 font-sans">
                    {selectedItem.prompt}
                  </p>
                </div>
              )}

              {/* Status & Timing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Status:</span>
                  <span
                    className={`font-semibold capitalize ${
                      selectedItem.execution_status === 'success'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedItem.execution_status}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Execution Latency:</span>
                  <span className="font-mono text-slate-200">
                    {selectedItem.execution_time_ms} ms
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Recorded At:</span>
                  <span className="text-slate-300">
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Error Message if failed */}
              {selectedItem.error_message && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <span className="font-bold text-rose-400">Error Output:</span>
                  <p className="font-mono">{selectedItem.error_message}</p>
                </div>
              )}

              {/* Executed / Selected SQL Query */}
              {selectedItem.selected_query && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Executed SQL Statement:
                  </label>
                  <SqlHighlighter sql={selectedItem.selected_query} maxHeight="max-h-56" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleReuseInGenerator(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reuse in Generator</span>
                </button>
                <button
                  onClick={() => {
                    handleReuseInStudio(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-brand-600/20 transition-all"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Reuse in SQL Studio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
