import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Database,
  History,
  Terminal,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
} from 'lucide-react';
import { api } from '../services/api';
import { Dialect } from '../types';

interface HealthStatus {
  mysql: boolean;
  postgres: boolean;
  checking: boolean;
}

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus>({
    mysql: false,
    postgres: false,
    checking: false,
  });
  const location = useLocation();

  const checkDbStatus = async () => {
    setHealth((prev) => ({ ...prev, checking: true }));
    try {
      // Check MySQL
      let mysqlOk = false;
      try {
        const schema = await api.getSchema('mysql');
        mysqlOk = Array.isArray(schema.tables);
      } catch {
        mysqlOk = false;
      }

      // Check Postgres
      let postgresOk = false;
      try {
        const schema = await api.getSchema('postgres');
        postgresOk = Array.isArray(schema.tables);
      } catch {
        postgresOk = false;
      }

      setHealth({
        mysql: mysqlOk,
        postgres: postgresOk,
        checking: false,
      });
    } catch {
      setHealth({
        mysql: false,
        postgres: false,
        checking: false,
      });
    }
  };

  useEffect(() => {
    checkDbStatus();
    const interval = setInterval(checkDbStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { name: 'Your Database', path: '/', icon: Layers },
    { name: 'Ask a Question', path: '/generator', icon: Sparkles },
    { name: 'SQL Studio', path: '/studio', icon: Terminal },
    { name: 'History', path: '/history', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-amber-50/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <NavLink to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  GenAI SQL Studio
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-brand-500/10 text-brand-400 rounded-full border border-brand-500/20">
                  v1.0
                </span>
              </div>
            </NavLink>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Database Health Status & Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-1">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                DBs:
              </span>

              {/* MySQL Status */}
              <div
                className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/40"
                title={`MySQL Connection: ${health.mysql ? 'Active' : 'Offline'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.mysql ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-300 font-mono text-[11px]">MySQL</span>
              </div>

              {/* PostgreSQL Status */}
              <div
                className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/40"
                title={`PostgreSQL Connection: ${health.postgres ? 'Active' : 'Offline'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.postgres ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-300 font-mono text-[11px]">Postgres</span>
              </div>

              <button
                onClick={checkDbStatus}
                disabled={health.checking}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Refresh Database Status"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${health.checking ? 'animate-spin text-brand-400' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex items-center justify-around py-2 px-3 border-t border-slate-200/60 bg-amber-50/90">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
                isActive ? 'text-brand-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};
