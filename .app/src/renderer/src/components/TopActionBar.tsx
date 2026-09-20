import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  FolderPlus, 
  FileEdit, 
  Share2, 
  ChevronRight, 
  Home, 
  RefreshCw, 
  Sparkles, 
  Check,
  X,
  Settings,
  Telescope
} from 'lucide-react';

interface TopActionBarProps {
  currentPath: string;
  selectedFile: string | null;
  isEditMorphed: boolean;
  onImportFiles: () => Promise<void>;
  onImportFolder: () => Promise<void>;
  onCreateNote: (name: string, title?: string) => Promise<void>;
  onEditInDesktop: () => Promise<void>;
  onSaveAndShare: () => Promise<void>;
  onSyncDrive?: () => Promise<void>;
  onOpenSettings?: () => void;
  isSyncing: boolean;
  isDriveSyncing?: boolean;
  showToast?: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
}

export const TopActionBar: React.FC<TopActionBarProps> = ({
  currentPath,
  selectedFile,
  isEditMorphed,
  onImportFiles,
  onImportFolder,
  onCreateNote,
  onEditInDesktop,
  onSaveAndShare,
  onSyncDrive,
  onOpenSettings,
  isSyncing,
  isDriveSyncing = false,
  showToast
}) => {
  const [showNewDropdown, setShowNewDropdown] = useState<boolean>(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState<boolean>(false);
  const [newNoteName, setNewNoteName] = useState<string>('');
  const [newNoteTitle, setNewNoteTitle] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNewDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteName.trim()) return;
    await onCreateNote(newNoteName.trim(), newNoteTitle.trim() || undefined);
    setNewNoteName('');
    setNewNoteTitle('');
    setShowNewNoteModal(false);
  };

  const handleOpenKStars = async () => {
    try {
      const res = await window.api.shell.openKStars();
      if (res && res.success) {
        if (showToast) showToast('success', 'KStars Active', res.message);
      } else {
        if (showToast) {
          showToast('warning', 'KStars Launcher', res?.message || 'KStars executable could not be found.');
        }
      }
    } catch (err: any) {
      if (showToast) {
        showToast('error', 'KStars Launch Error', err.message || 'Failed to start KStars.');
      }
    }
  };

  // Breadcrumbs parsing
  const pathParts = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : [];

  return (
    <div className="relative z-20 flex items-center justify-between mx-2.5 my-2 px-3.5 h-11 bg-obsidian-900/80 border border-white/[0.08] backdrop-blur-xl rounded-xl shadow-lg select-none">
      {/* Left: Pill "New" Action & Minimalist Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Persistent "+ New" Pill with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNewDropdown(!showNewDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-medium text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-100 border border-white/[0.08] transition-all active:scale-[0.98] shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>New</span>
          </button>

          {showNewDropdown && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-obsidian-900/95 border border-white/[0.1] shadow-2xl backdrop-blur-2xl p-1.5 z-30 font-sans text-xs">
              <button
                onClick={() => {
                  setShowNewDropdown(false);
                  onImportFiles();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors text-left"
              >
                <Upload className="w-4 h-4 text-sapphire-400" />
                <div>
                  <div className="font-medium text-slate-200">Import File(s)</div>
                  <div className="text-[10px] text-slate-500">Copy spectra, CSVs, or slides into folder</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowNewDropdown(false);
                  onImportFolder();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors text-left"
              >
                <FolderPlus className="w-4 h-4 text-sapphire-400" />
                <div>
                  <div className="font-medium text-slate-200">Import Folder</div>
                  <div className="text-[10px] text-slate-500">Recursively import directories</div>
                </div>
              </button>

              <div className="h-px bg-white/[0.06] my-1" />

              <button
                onClick={() => {
                  setShowNewDropdown(false);
                  setShowNewNoteModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors text-left"
              >
                <FileEdit className="w-4 h-4 text-nothing-400" />
                <div>
                  <div className="font-medium text-slate-200">New Note</div>
                  <div className="text-[10px] text-slate-500">Markdown document with math support</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Minimalist Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs font-sans text-slate-400 overflow-x-auto py-1">
          <div className="flex items-center gap-1 text-slate-300 font-medium shrink-0">
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>AstroSquad</span>
          </div>

          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span className={`truncate max-w-[150px] ${
                index === pathParts.length - 1 ? 'text-slate-200 font-medium' : 'text-slate-500'
              }`}>
                {part}
              </span>
            </React.Fragment>
          ))}

          {selectedFile && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="text-white font-semibold truncate max-w-[200px]">
                {selectedFile.split(/[/\\]/).pop()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Floating Control Cluster */}
      <div className="flex items-center gap-2">
        {isEditMorphed ? (
          /* Nothing Signature Crimson "Save & Share" Button */
          <button
            onClick={onSaveAndShare}
            disabled={isSyncing}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg font-sans font-medium text-xs text-white bg-nothing hover:bg-nothing-600 border border-nothing-400/30 transition-all shadow-crimson active:scale-[0.98] disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Save & Share</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 border border-white/20 text-white/90">
                  PUSH
                </span>
              </>
            )}
          </button>
        ) : (
          /* Standard Contextual "Edit" Button */
          <button
            onClick={onEditInDesktop}
            disabled={!selectedFile || isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-medium text-xs border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-white/[0.04] disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            title={selectedFile ? "Pulls remote changes & opens file in default desktop app" : "Select a file to edit"}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : (
              <FileEdit className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Edit</span>
          </button>
        )}

        {/* Sync from Google Drive Desktop */}
        {onSyncDrive && (
          <button
            onClick={onSyncDrive}
            disabled={isDriveSyncing || isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all text-xs font-sans active:scale-[0.98] disabled:opacity-50"
            title="Pull updated slides, sheets, and documents from Google Drive (G:\My Drive\The-AstroSquad)"
          >
            {isDriveSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="font-medium">Sync Drive</span>
          </button>
        )}

        <button
          onClick={async () => {
            if (showToast) {
              showToast('info', 'Opening Google Drive', 'Opening local Google Drive Desktop folder...');
            }
            try {
              const res = await window.api.shell.openGoogleDriveFolder();
              if (res && res.message && showToast) {
                showToast('success', 'Google Drive Desktop', res.message);
              }
            } catch (err: any) {
              if (showToast) {
                showToast('error', 'Google Drive Error', err.message);
              }
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all text-xs font-sans active:scale-[0.98]"
          title="Open The-AstroSquad Google Drive Desktop Folder (G:\My Drive\The-AstroSquad)"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline font-medium">Google Drive</span>
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all active:scale-[0.98]"
            title="Station Mission Settings (Custom Apps, Repositories, Discord)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Create New Note Modal */}
      {showNewNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-obsidian-900/90 border border-white/[0.1] p-6 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-nothing-400" />
                <span>Create Markdown Note</span>
              </h3>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNoteSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  File Name
                </label>
                <input
                  type="text"
                  placeholder="spectral-analysis-notes.md"
                  value={newNoteName}
                  onChange={(e) => setNewNoteName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Note Heading (Optional)
                </label>
                <input
                  type="text"
                  placeholder="M82 Starburst vs M31 Spectral Analysis"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-sans text-slate-100 placeholder-slate-600 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewNoteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-sans text-slate-400 hover:text-white transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold text-xs font-sans transition-all shadow-sm active:scale-[0.98]"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
