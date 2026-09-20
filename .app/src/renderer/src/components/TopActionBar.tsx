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
  Settings
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

  // Breadcrumbs parsing
  const pathParts = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : [];

  return (
    <div className="relative z-20 flex items-center justify-between px-4 h-11 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md select-none">
      {/* Left: Persistent Green "+ New" Button & Breadcrumbs */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Persistent Green "+ New" Button with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNewDropdown(!showNewDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {showNewDropdown && (
            <div className="absolute left-0 mt-1.5 w-60 rounded-lg bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur-xl p-1 z-30 font-sans text-xs">
              <button
                onClick={() => {
                  setShowNewDropdown(false);
                  onImportFiles();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold">Import File(s) from Computer</div>
                  <div className="text-[10px] text-slate-400">Copy spectra, CSVs, or slides into folder</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowNewDropdown(false);
                  onImportFolder();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
              >
                <FolderPlus className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-semibold">Import Folder from Computer</div>
                  <div className="text-[10px] text-slate-400">Recursively import subdirectories</div>
                </div>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <button
                onClick={() => {
                  setShowNewDropdown(false);
                  setShowNewNoteModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
              >
                <FileEdit className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="font-semibold">Create New Markdown Note</div>
                  <div className="text-[10px] text-slate-400">Template with Doppler math headers</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Breadcrumb Path Bar */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 overflow-x-auto py-1">
          <div className="flex items-center gap-1 text-slate-300 font-semibold shrink-0">
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>AstroSquad</span>
          </div>

          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span className={`truncate max-w-[150px] ${
                index === pathParts.length - 1 ? 'text-cyan-300 font-bold' : 'text-slate-400'
              }`}>
                {part}
              </span>
            </React.Fragment>
          ))}

          {selectedFile && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="text-slate-200 font-medium truncate max-w-[200px]">
                {selectedFile.split(/[/\\]/).pop()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Contextual Edit Button / Glowing "Save & Share" */}
      <div className="flex items-center gap-2">
        {isEditMorphed ? (
          /* Glowing "Save & Share" Button */
          <button
            onClick={onSaveAndShare}
            disabled={isSyncing}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold text-xs text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/40 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Save & Share</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950/80 border border-rose-400/40 text-rose-200">
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-900/80 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
            title={selectedFile ? "Pulls remote changes & opens file in default desktop app" : "Select a file to edit"}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <FileEdit className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Edit</span>
          </button>
        )}

        {/* Sync from Google Drive Desktop */}
        {onSyncDrive && (
          <button
            onClick={onSyncDrive}
            disabled={isDriveSyncing || isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white transition-colors text-xs font-mono shadow-sm active:scale-95 disabled:opacity-50"
            title="Pull updated slides, sheets, and documents from Google Drive (G:\My Drive\The-AstroSquad)"
          >
            {isDriveSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold">Sync Drive</span>
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-mono shadow-sm active:scale-95"
          title="Open The-AstroSquad Google Drive Desktop Folder (G:\My Drive\The-AstroSquad)"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline font-medium">Google Drive</span>
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1 rounded-md border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors shadow-sm active:scale-95"
            title="Station Mission Settings (Custom Apps, Repositories, Discord)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Create New Note Modal */}
      {showNewNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-cyan-400" />
                <span>Create New Markdown Note</span>
              </h3>
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNoteSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  File Name:
                </label>
                <input
                  type="text"
                  placeholder="m31-radial-velocity-notes.md"
                  value={newNoteName}
                  onChange={(e) => setNewNoteName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Note Heading (Optional):
                </label>
                <input
                  type="text"
                  placeholder="M82 Starburst vs M31 Spectral Analysis"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-sans text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewNoteModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm"
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
