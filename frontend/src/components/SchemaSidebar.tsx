import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Columns,
  Key,
  Link,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Copy,
  Check,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';
import { Dialect, SchemaInfo, TableInfo } from '../types';
import { api } from '../services/api';

interface SchemaSidebarProps {
  dialect: Dialect;
  onSelectTable?: (tableName: string) => void;
  onSelectColumn?: (colName: string, tableName: string) => void;
  className?: string;
}

export const SchemaSidebar: React.FC<SchemaSidebarProps> = ({
  dialect,
  onSelectTable,
  onSelectColumn,
  className = '',
}) => {
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSchema(dialect);
      setSchema(data);
      // Auto expand first 2 tables if any
      const initialExpanded: Record<string, boolean> = {};
      if (data.tables && data.tables.length > 0) {
        data.tables.slice(0, 2).forEach((t) => {
          initialExpanded[t.name] = true;
        });
      }
      setExpandedTables(initialExpanded);
    } catch (err: any) {
      setError(err.message || 'Failed to introspect schema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [dialect]);

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedItem(text);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  const filteredTables = (schema?.tables || []).filter((table) => {
    const term = search.toLowerCase();
    const matchesTable = table.name.toLowerCase().includes(term);
    const matchesColumn = table.columns.some((c) => c.name.toLowerCase().includes(term));
    return matchesTable || matchesColumn;
  });

  return (
    <aside
      className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden glass-panel ${className}`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Database Schema</h3>
              <p className="text-[11px] text-slate-400 font-mono capitalize">
                {dialect} introspection
              </p>
            </div>
          </div>
          <button
            onClick={fetchSchema}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh Schema"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables &amp; columns..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Schema Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-6 bg-slate-800 rounded-lg w-3/4"></div>
                <div className="h-4 bg-slate-800/50 rounded-lg w-1/2 ml-4"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Schema error</span>
            </div>
            <p className="text-slate-400 text-[11px]">{error}</p>
            <button
              onClick={fetchSchema}
              className="text-[11px] text-brand-400 hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredTables.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs">
            No tables matching &quot;{search}&quot;
          </div>
        )}

        {!loading &&
          !error &&
          filteredTables.map((tbl) => {
            const isExpanded = !!expandedTables[tbl.name] || !!search;

            return (
              <div
                key={tbl.name}
                className="rounded-xl border border-slate-800/80 bg-slate-950/50 overflow-hidden transition-all"
              >
                {/* Table Row Header */}
                <div
                  onClick={() => toggleTable(tbl.name)}
                  className="flex items-center justify-between px-3 py-2 bg-slate-900/60 hover:bg-slate-850 cursor-pointer text-xs group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <Table className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    <span className="font-mono font-medium text-slate-200 truncate group-hover:text-brand-300">
                      {tbl.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                      {tbl.columns.length}
                    </span>
                    <button
                      onClick={(e) => handleCopy(tbl.name, e)}
                      className="p-1 text-slate-500 hover:text-slate-200 rounded transition-colors"
                      title="Copy table name"
                    >
                      {copiedItem === tbl.name ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    {onSelectTable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTable(tbl.name);
                        }}
                        className="p-1 text-slate-500 hover:text-brand-400 rounded transition-colors"
                        title="Insert into prompt"
                      >
                        <PlusCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Columns List */}
                {isExpanded && (
                  <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/80 divide-y divide-slate-900/60 text-xs">
                    {tbl.columns.map((col) => {
                      const isPk = tbl.primaryKeys.includes(col.name);
                      const fk = tbl.foreignKeys.find((f) => f.column === col.name);

                      return (
                        <div
                          key={col.name}
                          className="flex items-center justify-between py-1.5 hover:bg-slate-900/50 px-1.5 rounded transition-colors group"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {isPk ? (
                              <span title="Primary Key" className="inline-flex shrink-0">
                                <Key className="w-3 h-3 text-amber-400" />
                              </span>
                            ) : fk ? (
                              <span title={`FK -> ${fk.referencedTable}.${fk.referencedColumn}`} className="inline-flex shrink-0">
                                <Link className="w-3 h-3 text-indigo-400" />
                              </span>
                            ) : (
                              <Columns className="w-3 h-3 text-slate-500 shrink-0" />
                            )}
                            <span className="font-mono text-[11px] text-slate-300 truncate">
                              {col.name}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {col.type}
                            </span>
                            {isPk && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
                                PK
                              </span>
                            )}
                            {fk && (
                              <span
                                className="text-[9px] text-indigo-300 bg-indigo-500/10 px-1 rounded truncate max-w-[80px]"
                                title={`FK to ${fk.referencedTable}.${fk.referencedColumn}`}
                              >
                                FK
                              </span>
                            )}
                            <button
                              onClick={(e) => handleCopy(col.name, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-white transition-opacity"
                              title="Copy column"
                            >
                              {copiedItem === col.name ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                            {onSelectColumn && (
                              <button
                                onClick={() => onSelectColumn(col.name, tbl.name)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-brand-400 transition-opacity"
                                title="Insert column"
                              >
                                <PlusCircle className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </aside>
  );
};
