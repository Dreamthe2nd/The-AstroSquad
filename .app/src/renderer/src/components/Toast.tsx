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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none font-sans">
      {toasts.map((toast) => {
        let borderClass = 'border-white/[0.08] bg-obsidian-950/90';
        let icon = <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />;

        if (toast.type === 'success') {
          borderClass = 'border-white/[0.12] bg-obsidian-950/95 shadow-ambient';
          icon = <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'conflict' || toast.type === 'error') {
          borderClass = 'border-nothing-500/30 bg-obsidian-950/95 shadow-crimson';
          icon = <AlertTriangle className="w-4 h-4 text-nothing-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/30 bg-obsidian-950/95 shadow-ambient';
          icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-2xl transition-all duration-300 transform translate-y-0 shadow-2xl ${borderClass}`}
          >
            <div className="flex items-start gap-3">
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-white flex items-center gap-2">
                  {toast.title}
                  {toast.type === 'conflict' && (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-full bg-nothing-950/70 text-nothing-300 border border-nothing-500/30">
                      Guardrail Active
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words font-sans">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-500 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/[0.06]"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
