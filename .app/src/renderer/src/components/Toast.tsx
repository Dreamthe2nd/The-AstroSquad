import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { ToastNotification } from '../types';

interface ToastProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-slate-700 bg-slate-900/95';
        let icon = <Info className="w-5 h-5 text-cyan-400 shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-cyan-500/60 shadow-doppler-blue bg-slate-950/95';
          icon = <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0" />;
        } else if (toast.type === 'conflict' || toast.type === 'error') {
          borderClass = 'border-rose-500/80 shadow-doppler-red bg-slate-950/95';
          icon = <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/60 bg-slate-950/95';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${borderClass}`}
          >
            <div className="flex items-start gap-3">
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                  {toast.title}
                  {toast.type === 'conflict' && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Guardrail Active
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words font-sans">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
