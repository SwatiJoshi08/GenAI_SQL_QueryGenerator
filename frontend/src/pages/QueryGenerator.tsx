import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Database,
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Info,
  Sliders,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Send,
  Loader2,
  Maximize2,
  Layers,
} from 'lucide-react';
import { Dialect, QueryCandidate, GenerateResponse } from '../types';
import { api } from '../services/api';
import { SqlHighlighter } from '../components/SqlHighlighter';
import { RiskBadge } from '../components/RiskBadge';
import { SchemaSidebar } from '../components/SchemaSidebar';

export const QueryGenerator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [dialect, setDialect] = useState<Dialect>(
    (location.state as any)?.dialect || 'mysql'
  );
  const [prompt, setPrompt] = useState<string>(
    (location.state as any)?.prompt || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<QueryCandidate[]>([]);
  const [historyId, setHistoryId] = useState<number | undefined>(undefined);
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<number>(0);

  // Auto-run if passed from dashboard
  useEffect(() => {
    if ((location.state as any)?.autoRun && (location.state as any)?.prompt) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a query prompt or question.');
      return;
    }

    setLoading(true);
    setError(null);
    setCandidates([]);

    try {
      const response: GenerateResponse = await api.generateQueries(dialect, prompt);
      if (response.candidates && response.candidates.length > 0) {
        setCandidates(response.candidates);
        setHistoryId(response.historyId);
        setSelectedCandidateIdx(0);
      } else {
        setError('No query candidates generated. Please refine your request.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate queries. Please ensure Groq API key is configured.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleInsertFromSchema = (name: string) => {
    setPrompt((prev) => (prev ? `${prev} ${name}` : name));
  };

  const handleSelectQuery = (candidate: QueryCandidate) => {
    navigate('/studio', {
      state: {
        sql: candidate.sql,
        dialect,
        prompt,
        historyId,
        impact: candidate.impact,
        validation: candidate.validation,
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-brand-400" />
            Query Generator &amp; Candidate Comparison
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Turn natural language business requirements into verified, high-performance SQL candidates.
          </p>
        </div>

        {/* Dialect Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setDialect('mysql')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dialect === 'mysql'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>MySQL</span>
          </button>
          <button
            onClick={() => setDialect('postgres')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dialect === 'postgres'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL</span>
          </button>
        </div>
      </div>

      {/* Main Generator Grid (Sidebar + Input Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Collapsible Schema Explorer */}
        <div className="lg:col-span-1">
          <SchemaSidebar
            dialect={dialect}
            onSelectTable={handleInsertFromSchema}
            onSelectColumn={handleInsertFromSchema}
            className="h-[520px]"
          />
        </div>

        {/* Right Column: Prompt Input + Candidate Comparison */}
        <div className="lg:col-span-3 space-y-6">
          {/* Natural Language Prompt Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl glass-panel space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-400" />
                Prompt / Business Question:
              </label>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Ctrl</kbd> +{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Enter</kbd> to generate
              </span>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Describe the data you need, aggregations, filters, joins, or mutations (e.g. 'Show monthly order counts for users who registered in 2024 grouped by state with total revenue')..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 leading-relaxed font-sans"
              />
            </div>

            {/* Bottom action row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                Target Engine: <strong className="text-slate-200 capitalize font-mono">{dialect}</strong>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing &amp; Generating Candidates...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Generate SQL Candidates</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200">Generation Error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Candidates Comparison Section */}
          {candidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-brand-400" />
                  <h2 className="text-lg font-bold text-white">
                    Generated Candidate Alternatives ({candidates.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Compare syntax, narrative, estimated rows &amp; optimizations
                </span>
              </div>

              {/* Candidate Cards Grid */}
              <div className="grid grid-cols-1 gap-5">
                {candidates.map((candidate, idx) => {
                  const val = candidate.validation;
                  const impact = candidate.impact;
                  const opt = candidate.optimize;
                  const expl = candidate.explain;

                  return (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all shadow-xl glass-panel flex flex-col space-y-4 p-5"
                    >
                      {/* Candidate Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-300 font-mono font-bold text-xs flex items-center justify-center border border-brand-500/30">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {candidate.title || `Candidate Variation ${idx + 1}`}
                          </span>
                          {candidate.complexity && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {candidate.complexity} complexity
                            </span>
                          )}
                        </div>

                        {/* Badges: Risk & Validation */}
                        <div className="flex items-center space-x-2">
                          <RiskBadge level={val?.riskLevel || impact?.riskLevel || 'low'} size="sm" />
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              val?.valid
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {val?.valid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Syntax &amp; Schema Valid</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                <span>Validation Issues</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* SQL Code Block */}
                      <SqlHighlighter sql={candidate.sql} maxHeight="max-h-56" />

                      {/* Explanation Narrative */}
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                          <Info className="w-3.5 h-3.5 text-brand-400" />
                          <span>Natural Language Explanation:</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {expl?.narrative || candidate.explanation}
                        </p>
                      </div>

                      {/* Metadata Chips: Tables, Columns, Joins, Estimated Impact */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Structure info */}
                        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-2">
                          <span className="text-slate-400 font-medium text-[11px] block">
                            Referenced Schema Entities:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(candidate.tables || expl?.structure?.tables || []).map((t, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 font-mono text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                            {(candidate.columns || expl?.structure?.columns || []).slice(0, 5).map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Impact & Performance Hint */}
                        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-1.5">
                          <span className="text-slate-400 font-medium text-[11px] block">
                            Estimated Impact &amp; Safety:
                          </span>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Estimated Rows:</span>
                            <span className="font-mono font-bold text-slate-200">
                              {impact?.estimatedRows !== undefined
                                ? `${impact.estimatedRows.toLocaleString()} (${impact.method || 'explain'})`
                                : 'Calculated at runtime'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Requires Confirmation:</span>
                            <span
                              className={`font-semibold ${
                                impact?.confirmationRequired ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {impact?.confirmationRequired ? 'Yes (Mutating)' : 'No (Safe Read)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Optimization Suggestions (if any) */}
                      {opt?.suggestions && opt.suggestions.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-amber-400 text-[11px]">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Performance Optimization Hints:</span>
                          </div>
                          <ul className="list-disc list-inside text-amber-200/90 text-[11px] space-y-0.5 pl-1">
                            {opt.suggestions.map((sug, sIdx) => (
                              <li key={sIdx}>{sug.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Card Footer: Select & Open Action */}
                      <div className="flex items-center justify-end pt-2 border-t border-slate-800/60">
                        <button
                          onClick={() => handleSelectQuery(candidate)}
                          className="flex items-center space-x-2 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all cursor-pointer"
                        >
                          <span>Select &amp; Open in SQL Studio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
