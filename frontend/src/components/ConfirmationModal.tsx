import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X, Check, Lock } from 'lucide-react';
import { SqlHighlighter } from './SqlHighlighter';
import { Dialect } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sql: string;
  dialect: Dialect;
  operation?: string;
  estimatedRows?: number;
  warnings?: string[];
  isExecuting?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sql,
  dialect,
  operation = 'MUTATION',
  estimatedRows,
  warnings = [],
  isExecuting = false,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const REQUIRED_KEYWORD = 'CONFIRM';

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmationInput.trim().toUpperCase() === REQUIRED_KEYWORD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/50 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-950/60 to-slate-900 border-b border-rose-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Dangerous Operation Confirmation
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono uppercase">
                  {operation}
                </span>
              </h3>
              <p className="text-xs text-rose-300/80">
                This query alters database state on <span className="font-semibold capitalize">{dialect}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Warning Banner */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-sm space-y-2">
            <div className="flex items-start gap-2.5 font-medium text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span>Estimated Affected Rows: </span>
                <span className="font-bold text-white text-base ml-1">
                  {typeof estimatedRows === 'number' ? estimatedRows.toLocaleString() : 'Unknown / Calculated at runtime'}
                </span>
              </div>
            </div>
            {warnings.length > 0 && (
              <ul className="list-disc list-inside text-xs text-rose-300/90 pl-1 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-400 pt-1">
              Safety precaution: If actual affected rows exceed 2x the estimated count, the transaction will automatically rollback.
            </p>
          </div>

          {/* SQL Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Query to Execute:
            </label>
            <SqlHighlighter sql={sql} maxHeight="max-h-40" />
          </div>

          {/* User Confirmation Input */}
          <div className="pt-2 space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Type <strong className="text-rose-400 font-mono tracking-widest">{REQUIRED_KEYWORD}</strong> below to confirm execution:
            </label>
            <div className="relative">
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={`Type "${REQUIRED_KEYWORD}"`}
                disabled={isExecuting}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-white font-mono placeholder:text-slate-600 transition-all text-sm uppercase tracking-wider"
                autoFocus
              />
              {isConfirmed && (
                <Check className="w-5 h-5 text-emerald-400 absolute right-3 top-3" />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isConfirmed || isExecuting}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              isConfirmed && !isExecuting
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Executing Safe Transaction...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirm &amp; Execute</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
