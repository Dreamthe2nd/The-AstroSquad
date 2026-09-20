import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  HardDrive, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  X, 
  ExternalLink,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PrerequisitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
}

export const PrerequisitesModal: React.FC<PrerequisitesModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [installingDrive, setInstallingDrive] = useState<boolean>(false);
  const [installingObsidian, setInstallingObsidian] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    platform: 'win32' | 'darwin' | 'linux';
    googleDrive: { installed: boolean; running: boolean; path?: string; label: string };
    obsidian: { installed: boolean; path?: string; label: string };
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await window.api.prerequisites.checkPrerequisites();
      setStatus(res);
    } catch (err: any) {
      console.warn('Failed to check prerequisites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallDrive = async () => {
    setInstallingDrive(true);
    showToast('info', 'Installing Google Drive', 'Starting automated background installation...');
    try {
      const res = await window.api.prerequisites.installGoogleDrive();
      if (res.success) {
        showToast('success', 'Google Drive Setup', res.message);
      } else {
        showToast('warning', 'Google Drive Notice', res.message);
      }
      await fetchStatus();
    } catch (err: any) {
      showToast('error', 'Installation Failed', err.message || 'Unable to install Google Drive.');
    } finally {
      setInstallingDrive(false);
    }
  };

  const handleInstallObsidian = async () => {
    setInstallingObsidian(true);
    showToast('info', 'Installing Obsidian', 'Starting automated background installation...');
    try {
      const res = await window.api.prerequisites.installObsidian();
      if (res.success) {
        showToast('success', 'Obsidian Setup', res.message);
      } else {
        showToast('warning', 'Obsidian Notice', res.message);
      }
      await fetchStatus();
    } catch (err: any) {
      showToast('error', 'Installation Failed', err.message || 'Unable to install Obsidian.');
    } finally {
      setInstallingObsidian(false);
    }
  };

  const handleInstallAll = async () => {
    if (!status?.googleDrive.installed) {
      handleInstallDrive();
    }
    if (!status?.obsidian.installed) {
      handleInstallObsidian();
    }
  };

  const allReady = status?.googleDrive.installed && status?.obsidian.installed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-2xl font-sans">
      <div className="relative w-full max-w-2xl rounded-2xl bg-obsidian-900/90 border border-white/[0.08] shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in duration-200">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight font-sans">
                  Station Prerequisites &amp; Diagnostic Setup
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                  {status?.platform === 'darwin' ? 'MACOS' : status?.platform === 'win32' ? 'WINDOWS' : 'LINUX'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Verifies essential companion tools for automated cloud sync and markdown lab vaults.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Refresh status check"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-nothing' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body Cards */}
        <div className="p-6 space-y-4">
          {/* Card 1: Google Drive Desktop */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sapphire-400 mt-0.5 shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white font-sans">
                      Google Drive Desktop
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                      REQUIRED FOR SYNC
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-0.5">
                    Provides continuous bidirectional synchronization with <code className="text-slate-200 font-mono text-[10px]">G:\My Drive\The-AstroSquad</code> so edits to Slides &amp; Sheets mirror automatically.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {status?.googleDrive.installed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{status.googleDrive.running ? 'Active & Ready' : 'Installed'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Missing</span>
                  </span>
                )}
              </div>
            </div>

            {/* Path / Action */}
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
              <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                {status?.googleDrive.path ? `Path: ${status.googleDrive.path}` : 'Default root: G:\\My Drive'}
              </div>
              {!status?.googleDrive.installed && (
                <button
                  onClick={handleInstallDrive}
                  disabled={installingDrive}
                  className="px-3 py-1.5 rounded-xl bg-nothing hover:bg-nothing-hover text-white font-sans text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {installingDrive ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{installingDrive ? 'Installing...' : '1-Click Install Google Drive'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Obsidian Markdown */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-purple-400 mt-0.5 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white font-sans">
                      Obsidian Markdown
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-0.5">
                    Opens research notes, hypotheses, and M82/M31 observational logs directly in an interconnected local lab vault with full LaTeX math support.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {status?.obsidian.installed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Installed &amp; Ready</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Missing</span>
                  </span>
                )}
              </div>
            </div>

            {/* Path / Action */}
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
              <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                {status?.obsidian.path ? `Path: ${status.obsidian.path}` : 'Supported: Windows AppData / macOS Applications'}
              </div>
              {!status?.obsidian.installed && (
                <button
                  onClick={handleInstallObsidian}
                  disabled={installingObsidian}
                  className="px-3 py-1.5 rounded-xl bg-nothing hover:bg-nothing-hover text-white font-sans text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {installingObsidian ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{installingObsidian ? 'Installing...' : '1-Click Install Obsidian'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-obsidian-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 font-sans">
            {allReady ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                All station companion tools are verified and ready.
              </span>
            ) : (
              <span>Install missing companion software or continue to the Flight Deck.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!allReady && (
              <button
                onClick={handleInstallAll}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-sans text-slate-200 hover:text-white font-medium transition-all active:scale-[0.98]"
              >
                Install All Missing
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-nothing hover:bg-nothing-hover text-xs font-sans text-white font-medium transition-all shadow-sm flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span>{allReady ? 'Enter Station' : 'Continue to Flight Deck'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
