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
  onOpenSettings?: () => void;
  isSyncing: boolean;
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
  onOpenSettings,
  isSyncing,
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
    <div className="relative z-20 flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md select-none">
      {/* Left: Persistent Green "+ New" Button & Breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Persistent Green "+ New" Button with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNewDropdown(!showNewDropdown)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md hover:shadow-emerald-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ New</span>
          </button>

          {showNewDropdown && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-1.5 z-30 font-sans text-xs">
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
      <div className="flex items-center gap-3">
        {isEditMorphed ? (
          /* Glowing "Save & Share" Button */
          <button
            onClick={onSaveAndShare}
            disabled={isSyncing}
            className="group relative flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-400 hover:to-pink-400 transition-all shadow-doppler-red animate-pulse-glow disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing with main...</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                <span>Save & Share</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-400/40 text-rose-200">
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
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-800/80 disabled:cursor-not-allowed transition-all shadow-sm"
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

        <button
          onClick={async () => {
            if (showToast) {
              showToast('info', 'Opening Google Drive', 'Launching The-AstroSquad Cloud Hub in default browser...');
            }
            try {
              const res = await window.api.shell.openGoogleSuite({
                appType: 'drive',
                windowMode: 'browser_tab'
              });
              if (res && res.message && showToast) {
                showToast('success', 'Google Drive Active', res.message);
              }
            } catch (err: any) {
              if (showToast) {
                showToast('error', 'Google Drive Error', err.message);
              }
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 hover:text-white transition-colors text-xs font-mono shadow-sm"
          title="Open The-AstroSquad Shared Cloud Hub (Google Drive)"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline font-semibold">Google Drive</span>
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors shadow-sm"
            title="Station Mission Settings (Custom Apps, Repositories, Discord)"
          >
            <Settings className="w-4 h-4" />
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
