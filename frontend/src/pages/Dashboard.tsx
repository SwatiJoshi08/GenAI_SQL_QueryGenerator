import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Database,
  Terminal,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Layers,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { Dialect, HistoryRecord, DialectHealth } from '../types';
import { RiskBadge } from '../components/RiskBadge';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [quickPrompt, setQuickPrompt] = useState('');
  const [selectedDialect, setSelectedDialect] = useState<Dialect>('mysql');
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dialectHealth, setDialectHealth] = useState<Record<Dialect, DialectHealth>>({
    mysql: { dialect: 'mysql', connected: false, tableCount: 0 },
    postgres: { dialect: 'postgres', connected: false, tableCount: 0 },
  });

  const samplePrompts = [
    { text: 'Show all users registered in the last 30 days', dialect: 'mysql' as Dialect },
    { text: 'Calculate total revenue and order count grouped by category', dialect: 'postgres' as Dialect },
    { text: 'Find top 5 customers who spent the most money', dialect: 'mysql' as Dialect },
    { text: 'Update product prices with a 10% discount for inactive items', dialect: 'postgres' as Dialect },
  ];

  const fetchDashboardData = async () => {
    // 1. Fetch History
    setLoadingHistory(true);
    try {
      const hist = await api.getHistory({ limit: 6 });
      setRecentHistory(hist.results || []);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoadingHistory(false);
    }

    // 2. Fetch Dialect Healths
    const checkHealth = async (d: Dialect): Promise<DialectHealth> => {
      const start = Date.now();
      try {
        const schema = await api.getSchema(d);
        return {
          dialect: d,
          connected: true,
          tableCount: schema.tables?.length ?? 0,
          latencyMs: Date.now() - start,
        };
      } catch (err: any) {
        return {
          dialect: d,
          connected: false,
          tableCount: 0,
          latencyMs: Date.now() - start,
          error: err.message,
        };
      }
    };

    const [mysqlHealth, postgresHealth] = await Promise.all([
      checkHealth('mysql'),
      checkHealth('postgres'),
    ]);

    setDialectHealth({
      mysql: mysqlHealth,
      postgres: postgresHealth,
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    navigate('/generator', {
      state: { prompt: quickPrompt, dialect: selectedDialect, autoRun: true },
    });
  };

  const handleSampleClick = (prompt: string, dialect: Dialect) => {
    navigate('/generator', {
      state: { prompt, dialect, autoRun: true },
    });
  };

  const totalRuns = recentHistory.length;
  const successRuns = recentHistory.filter((h) => h.execution_status === 'success').length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Quick Prompt Launcher */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-brand-950/40 border border-slate-800 p-6 sm:p-10 shadow-2xl shadow-brand-950/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered SQL Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Ask questions about your database in plain English
          </h1>
          <p className="text-sm sm:text-base text-gray-700">
            Explore your database, ask natural language questions, and get instant, safe SQL results.
          </p>

          {/* Quick Prompt Box */}
          <form onSubmit={handleQuickGenerate} className="pt-2 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-950/90 p-2 rounded-2xl border border-slate-700/80 shadow-inner">
              {/* Dialect Selector */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                <Database className="w-4 h-4 text-brand-400" />
                <select
                  value={selectedDialect}
                  onChange={(e) => setSelectedDialect(e.target.value as Dialect)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  <option value="mysql" className="bg-slate-900 text-white">
                    MySQL
                  </option>
                  <option value="postgres" className="bg-slate-900 text-white">
                    PostgreSQL
                  </option>
                </select>
              </div>

              {/* Prompt Input */}
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Ask in natural language e.g. 'Show monthly active users with highest purchase volume'..."
                className="flex-1 px-4 py-2 text-sm bg-transparent text-white placeholder:text-slate-500 focus:outline-none font-sans"
              />

              {/* Action Button */}
              <button
                type="submit"
                disabled={!quickPrompt.trim()}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Zap className="w-4 h-4" />
                <span>Generate</span>
              </button>
            </div>

            {/* Prompt Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Try asking:</span>
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSampleClick(sample.text, sample.dialect)}
                  className="px-2.5 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-all truncate max-w-xs"
                >
                  &quot;{sample.text}&quot;
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Metrics & Dialect Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* MySQL Status Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">MySQL Engine</h3>
                <span className="text-xs text-slate-400 font-mono">Port 3306</span>
              </div>
            </div>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                dialectHealth.mysql.connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {dialectHealth.mysql.connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <div>
              <span className="text-slate-500">Tables Introspected</span>
              <p className="text-base font-bold text-slate-200">
                {dialectHealth.mysql.tableCount}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Ping Latency</span>
              <p className="text-base font-bold text-slate-200">
                {dialectHealth.mysql.latencyMs ? `${dialectHealth.mysql.latencyMs} ms` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* PostgreSQL Status Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">PostgreSQL Engine</h3>
                <span className="text-xs text-slate-400 font-mono">Port 5432</span>
              </div>
            </div>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                dialectHealth.postgres.connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {dialectHealth.postgres.connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <div>
              <span className="text-slate-500">Tables Introspected</span>
              <p className="text-base font-bold text-slate-200">
                {dialectHealth.postgres.tableCount}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Ping Latency</span>
              <p className="text-base font-bold text-slate-200">
                {dialectHealth.postgres.latencyMs ? `${dialectHealth.postgres.latencyMs} ms` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Analytics Summary */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Execution Metrics</h3>
                <span className="text-xs text-slate-400">Live query tracker</span>
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <div>
              <span className="text-slate-500">Success Rate</span>
              <p className="text-base font-bold text-emerald-400">{successRate}%</p>
            </div>
            <div>
              <span className="text-slate-500">Recent Queries</span>
              <p className="text-base font-bold text-slate-200">{recentHistory.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Query Executions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Recent Query Executions</h2>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center space-x-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>View Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center bg-amber-50 border border-gray-200 rounded-2xl space-y-2">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading recent executions…</p>
          </div>
        ) : recentHistory.length === 0 ? (
          <div className="p-8 text-center bg-amber-50 border border-gray-200 rounded-2xl text-gray-600 text-xs">
            No queries yet. Try asking a question above to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentHistory.map((item) => (
              <div
                key={item.id}
                className="group p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                      {item.database_type}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[11px] font-semibold ${
                        item.execution_status === 'success'
                          ? 'text-emerald-400'
                          : item.execution_status === 'failed'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {item.execution_status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">{item.execution_status}</span>
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-200 line-clamp-2" title={item.prompt}>
                    {item.prompt || 'Direct SQL Execution'}
                  </p>

                  {item.selected_query && (
                    <div className="bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-slate-400 truncate">
                      {item.selected_query}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.execution_time_ms} ms
                  </span>
                  <button
                    onClick={() =>
                      navigate('/studio', {
                        state: {
                          sql: item.selected_query || (Array.isArray(item.generated_query) ? item.generated_query[0]?.sql : ''),
                          dialect: item.database_type,
                          prompt: item.prompt,
                        },
                      })
                    }
                    className="text-brand-400 hover:text-brand-300 font-semibold group-hover:underline flex items-center gap-1"
                  >
                    <span>Open in Studio</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
