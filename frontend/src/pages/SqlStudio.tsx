import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Layers,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Dialect, ValidationResult, ImpactResult, ExecuteResponse } from '../types';
import { api } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { ResultsTable } from '../components/ResultsTable';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { SchemaSidebar } from '../components/SchemaSidebar';

export const SqlStudio: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialSql =
    (location.state as any)?.sql || 'SELECT * FROM users LIMIT 10;';
  const initialDialect: Dialect =
    (location.state as any)?.dialect || 'mysql';
  const initialPrompt: string = (location.state as any)?.prompt || '';
  const initialHistoryId: number | undefined = (location.state as any)?.historyId;

  const [sql, setSql] = useState<string>(initialSql);
  const [dialect, setDialect] = useState<Dialect>(initialDialect);
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [historyId, setHistoryId] = useState<number | undefined>(initialHistoryId);

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(
    (location.state as any)?.validation || null
  );
  const [impact, setImpact] = useState<ImpactResult | null>(
    (location.state as any)?.impact || null
  );

  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecuteResponse | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live re-validation with debounce
  const runValidation = useCallback(
    async (querySql: string, currentDialect: Dialect) => {
      if (!querySql.trim()) {
        setValidation(null);
        setImpact(null);
        return;
      }

      setValidating(true);
      try {
        const valRes = await api.validateQuery(querySql, currentDialect);
        setValidation(valRes);

        if (valRes.valid) {
          try {
            const impRes = await api.analyzeImpact(querySql, currentDialect);
            setImpact(impRes);
          } catch (e) {
            console.error('Impact check error:', e);
          }
        } else {
          setImpact(null);
        }
      } catch (err: any) {
        setValidation({
          valid: false,
          errors: [err.message || 'Validation request failed'],
          warnings: [],
          riskLevel: 'blocked',
        });
      } finally {
        setValidating(false);
      }
    },
    []
  );

  // Validate initially and on changes (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      runValidation(sql, dialect);
    }, 400);

    return () => clearTimeout(handler);
  }, [sql, dialect, runValidation]);

  const handleExecuteClick = () => {
    const operation = validation?.operation || impact?.operation || 'SELECT';
    const isMutating = ['UPDATE', 'DELETE', 'DROP', 'TRUNCATE'].includes(operation.toUpperCase());
    const isHighRisk = validation?.riskLevel === 'high' || impact?.confirmationRequired;

    if (isMutating || isHighRisk) {
      setShowConfirmModal(true);
    } else {
      executeDirectly(false);
    }
  };

  const executeDirectly = async (confirmed: boolean = false) => {
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await api.executeQuery({
        sql,
        dialect,
        confirmed,
        historyId,
        prompt,
      });
      setExecutionResult(res);
      if (showConfirmModal) {
        setShowConfirmModal(false);
      }
    } catch (err: any) {
      setExecutionResult({
        success: false,
        error: err.message || 'Query execution failed',
        executionTimeMs: 0,
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = () => {
    // Simple query standard formatting
    const formatted = sql
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ',\n  ')
      .replace(/\b(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|GROUP BY|ORDER BY|HAVING|LIMIT|SET|VALUES)\b/gi, '\n$1\n  ')
      .trim();
    setSql(formatted);
  };

  const handleInsertFromSchema = (name: string) => {
    setSql((prev) => `${prev} ${name}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Terminal className="w-7 h-7 text-indigo-400" />
            Interactive SQL Studio &amp; Execution
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fine-tune queries with live schema validation, impact estimation, and secure transactional execution.
          </p>
        </div>

        {/* Dialect selector */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
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
      </div>

      {/* Main Grid (Schema Sidebar + Editor/Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Schema Reference */}
        <div className="lg:col-span-1">
          <SchemaSidebar
            dialect={dialect}
            onSelectTable={handleInsertFromSchema}
            onSelectColumn={handleInsertFromSchema}
            className="h-[600px]"
          />
        </div>

        {/* Right Column: SQL Editor, Validation, & Results */}
        <div className="lg:col-span-3 space-y-6">
          {/* Query Editor Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl glass-panel">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 gap-2">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-slate-300 font-mono flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-brand-400" />
                  SQL Editor ({dialect.toUpperCase()})
                </span>

                {validating && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin text-brand-400" />
                    Validating...
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFormat}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                  title="Format SQL"
                >
                  Format
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="relative p-1 bg-slate-950">
              {/* Plain-English summary */}
              <p className="text-sm text-gray-400 mb-1">Your query will retrieve the requested data in a safe manner.</p>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                rows={8}
                placeholder="Enter or edit SQL query..."
                className="w-full p-4 bg-transparent text-slate-100 font-mono text-sm leading-relaxed focus:outline-none resize-y selection:bg-brand-500 selection:text-white"
                spellCheck={false}
              />
            </div>

            {/* Status & Execution Bar */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              {/* Validation Status Pill */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {validation && (
                  <>
                    <RiskBadge level={validation.riskLevel || 'low'} size="sm" />
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold border ${
                        validation.valid
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {validation.valid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valid AST</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Validation Failed</span>
                        </>
                      )}
                    </span>
                  </>
                )}

                {impact && impact.estimatedRows !== undefined && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                    Est. rows: <strong className="text-white">{impact.estimatedRows.toLocaleString()}</strong> ({impact.method})
                  </span>
                )}
              </div>

              {/* Run Action */}
              <button
                onClick={handleExecuteClick}
                disabled={executing || !sql.trim() || validation?.valid === false}
                className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Query</span>
                  </>
                )}
              </button>
            </div>

            {/* Validation Errors/Warnings Accordion */}
            {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="p-4 bg-slate-950 border-t border-slate-800/80 space-y-2 text-xs">
                {validation.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
                {validation.warnings.map((warn, i) => (
                  <div key={i} className="flex items-start gap-2 text-amber-400">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                Execution Results
              </h3>
            </div>

            <ResultsTable result={executionResult} loading={executing} />
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Mutating / High-risk Queries */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => executeDirectly(true)}
        sql={sql}
        dialect={dialect}
        operation={validation?.operation || impact?.operation}
        estimatedRows={impact?.estimatedRows}
        warnings={[...(validation?.warnings || []), ...(impact?.warnings || [])]}
        isExecuting={executing}
      />
    </div>
  );
};
