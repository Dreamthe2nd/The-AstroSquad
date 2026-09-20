import React, { useState, useEffect, useRef } from 'react';
import { FileSidebar } from './FileSidebar';
import { TopActionBar } from './TopActionBar';
import { PdfViewer } from './viewers/PdfViewer';
import { PptxViewer } from './viewers/PptxViewer';
import { MarkdownViewer } from './viewers/MarkdownViewer';
import { ImageViewer } from './viewers/ImageViewer';
import { CsvViewer } from './viewers/CsvViewer';
import { CodeViewer } from './viewers/CodeViewer';
import { FileNode } from '../types';
import { Orbit, FileQuestion, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface WorkspaceProps {
  files: FileNode[];
  initialSelectedFile?: string | null;
  onReturnToHub: () => void;
  onRefreshFiles: () => Promise<void>;
  onOpenSettings?: () => void;
  showToast: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  files,
  initialSelectedFile,
  onReturnToHub,
  onRefreshFiles,
  onOpenSettings,
  showToast
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(initialSelectedFile || 'README.md');
  const [fileContent, setFileContent] = useState<string>('');
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [mimeType, setMimeType] = useState<string>('text/plain');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isEditMorphed, setIsEditMorphed] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);

  // Request cancellation ref to prevent out-of-order state updates during fast clicks
  const activeRequestIdRef = useRef<number>(0);

  const loadFile = async (filePath: string) => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoadingFile(true);
    // Explicitly reset content so viewers never receive old data during fetch
    setFileContent('');
    try {
      const res = await window.api.fs.readFile(filePath);
      // Discard obsolete response if a newer file was selected
      if (activeRequestIdRef.current !== requestId) return;
      setFileContent(res.content);
      setIsBinary(res.isBinary);
      setMimeType(res.mimeType);
    } catch (err: any) {
      if (activeRequestIdRef.current !== requestId) return;
      showToast('error', 'File Read Error', err.message);
      setFileContent('');
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsLoadingFile(false);
      }
    }
  };

  // Initial load on mount
  useEffect(() => {
    const target = initialSelectedFile || selectedFile;
    if (target) {
      loadFile(target);
    } else {
      const hasReadme = files && files.some((f) => f.name.toLowerCase() === 'readme.md');
      if (hasReadme) {
        setSelectedFile('README.md');
        loadFile('README.md');
      }
    }
  }, []);

  // Sync selected file when initialSelectedFile changes from parent (e.g. View Proposal)
  useEffect(() => {
    if (initialSelectedFile && initialSelectedFile !== selectedFile) {
      setSelectedFile(initialSelectedFile);
      loadFile(initialSelectedFile);
    }
  }, [initialSelectedFile]);

  const handleSelectFile = (node: FileNode) => {
    if (!node.isDirectory) {
      if (node.relativePath === selectedFile && !isLoadingFile) return;
      setSelectedFile(node.relativePath);
      setIsEditMorphed(false); // Reset morph state on new file selection
      loadFile(node.relativePath);
    }
  };

  /* ---------------- Actions: + New Dropdown ---------------- */

  const handleImportFiles = async () => {
    try {
      const currentDir = selectedFile ? selectedFile.split(/[/\\]/).slice(0, -1).join('/') : '';
      const res = await window.api.fs.importFiles(currentDir || undefined);
      if (res.success) {
        showToast('success', 'Files Imported', res.message);
        await onRefreshFiles();
      }
    } catch (err: any) {
      showToast('error', 'Import Failed', err.message);
    }
  };

  const handleImportFolder = async () => {
    try {
      const currentDir = selectedFile ? selectedFile.split(/[/\\]/).slice(0, -1).join('/') : '';
      const res = await window.api.fs.importFolder(currentDir || undefined);
      if (res.success) {
        showToast('success', 'Folder Imported', res.message);
        await onRefreshFiles();
      }
    } catch (err: any) {
      showToast('error', 'Import Failed', err.message);
    }
  };

  const handleCreateNote = async (filename: string, title?: string) => {
    try {
      const currentDir = selectedFile ? selectedFile.split(/[/\\]/).slice(0, -1).join('/') : '';
      const res = await window.api.fs.createMarkdownNote(currentDir, filename, title);
      if (res.success) {
        showToast('success', 'Note Created', `Created ${res.relativePath}`);
        await onRefreshFiles();
        setSelectedFile(res.relativePath);
      }
    } catch (err: any) {
      showToast('error', 'Note Creation Failed', err.message);
    }
  };

  /* ---------------- Actions: Edit in Desktop & Save/Share ---------------- */

  const handleOpenSystemDefault = async () => {
    if (!selectedFile) return;

    try {
      const fileName = selectedFile.split(/[/\\]/).pop();
      showToast('info', 'Opening App', `Launching ${fileName} in system default app...`);

      const result = await window.api.fs.openInDesktopApp(selectedFile, 'system_default');

      if (result && result.success) {
        showToast('success', 'App Launch Active', result.message);
        setIsEditMorphed(true);
      } else if (result && !result.success) {
        showToast('error', 'Open Failed', result.message);
      } else {
        showToast('info', 'File Action', 'Attempted to open file.');
      }
    } catch (err: any) {
      showToast('error', 'Launch Failed', err.message);
    }
  };

  const handleEditInDesktop = async () => {
    if (!selectedFile) return;

    try {
      const fileName = selectedFile.split(/[/\\]/).pop();
      showToast('info', 'Opening App', `Launching ${fileName} ...`);

      // 1. Launch file in configured app IMMEDIATELY (no network blocking)
      const result = await window.api.fs.openInDesktopApp(selectedFile);

      if (result && result.success) {
        showToast('success', 'App Launch Active', result.message);
        // Morph button into glowing "Save & Share" so user can publish updates easily
        setIsEditMorphed(true);
      } else if (result && !result.success) {
        showToast('error', 'Open Failed', result.message);
      } else {
        showToast('info', 'File Action', 'Attempted to open file.');
      }

      // 2. Non-blocking background sync to ensure local workspace has remote updates
      window.api.git.syncRepository().then((syncRes) => {
        if (syncRes && syncRes.conflictsResolved && syncRes.conflictsResolved.length > 0) {
          showToast('conflict', 'Guardrail Alert', 'Conflict resolved: Local edits backed up to preserve work.');
        }
      }).catch((syncErr) => {
        console.warn('Background sync check (non-blocking):', syncErr);
      });
    } catch (err: any) {
      showToast('error', 'Edit Launch Failed', err.message);
    }
  };

  const handleSyncFromDrive = async () => {
    setIsDriveSyncing(true);
    try {
      showToast('info', 'Syncing Google Drive', 'Checking G:\\My Drive\\The-AstroSquad for cloud updates...');
      const res = await window.api.drive.syncFromDrive();
      if (res.success) {
        if (res.updatedCount > 0) {
          const fileSummary = res.updatedFiles.slice(0, 3).join(', ') + (res.updatedFiles.length > 3 ? '...' : '');
          showToast('success', 'Google Drive Synced', `Pulled ${res.updatedCount} updated file(s) from Drive: ${fileSummary}`);
          setIsEditMorphed(true); // Glow Save & Share so user can push the cloud edits to GitHub
          await onRefreshFiles();
          if (selectedFile) {
            await loadFile(selectedFile);
          }
        } else {
          showToast('info', 'Already Up to Date', 'Google Drive is in sync with your local workspace.');
        }
      } else {
        showToast('warning', 'Google Drive Sync', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Drive Sync Error', err.message || 'Failed to sync with Google Drive.');
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleSaveAndShare = async () => {
    setIsSyncing(true);
    try {
      showToast('info', 'Sharing Station Updates', 'Staging modifications, generating commit, and pushing to main...');
      
      const fileName = selectedFile ? selectedFile.split(/[/\\]/).pop() : 'files';
      const notes = `Updated ${fileName}`;
      const pushRes = await window.api.git.commitAndPush(notes);
      
      if (pushRes.success) {
        showToast('success', 'Shared with Team', pushRes.message);
        setIsEditMorphed(false);
        await onRefreshFiles();
        if (selectedFile) await loadFile(selectedFile);
        // Also mirror latest repository files to Google Drive
        window.api.drive.syncToDrive().catch(() => {});
      } else if (pushRes.conflictsResolved && pushRes.conflictsResolved.length > 0) {
        showToast('conflict', 'Guardrail Protected Data', pushRes.message);
      } else {
        showToast('warning', 'Sync Notice', pushRes.message);
      }
    } catch (err: any) {
      showToast('error', 'Push Failed', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveMarkdownNote = async (newContent: string) => {
    if (!selectedFile) return;
    try {
      await window.api.fs.writeFile(selectedFile, newContent);
      setFileContent(newContent);
      showToast('success', 'Saved Locally', `Saved changes to ${selectedFile}. Click "Save & Share" when ready to push.`);
      setIsEditMorphed(true);
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message);
    }
  };

  /* ---------------- Active Viewer Dispatcher ---------------- */

  const renderActiveViewer = () => {
    if (!selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-slate-600">
            <Orbit className="w-6 h-6 animate-spin" style={{ animationDuration: '30s' }} />
          </div>
          <p className="text-xs text-slate-500 font-sans">Select a document or data file from the sidebar to inspect.</p>
        </div>
      );
    }

    if (isLoadingFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
          <p className="text-xs text-slate-400 font-sans tracking-wide">Loading document...</p>
        </div>
      );
    }

    const lower = selectedFile.toLowerCase();

    // 1. PDF Documents
    if (lower.endsWith('.pdf') || lower.endsWith('proposal')) {
      return (
        <PdfViewer
          key={selectedFile}
          filePath={selectedFile}
          base64Data={isBinary ? fileContent : undefined}
          onOpenInDesktop={handleOpenSystemDefault}
        />
      );
    }

    // 2. PPTX Slide Decks
    if (lower.endsWith('.pptx')) {
      return (
        <PptxViewer
          key={selectedFile}
          filePath={selectedFile}
          base64Data={fileContent}
          onOpenInDesktop={handleOpenSystemDefault}
        />
      );
    }

    // 3. CSV Tabular Catalogs
    if (lower.endsWith('.csv')) {
      return (
        <CsvViewer
          key={selectedFile}
          filePath={selectedFile}
          csvContent={fileContent}
          onSave={handleSaveMarkdownNote}
          onOpenInDesktop={handleOpenSystemDefault}
        />
      );
    }

    // 4. Astronomical Images
    if (['png', 'jpg', 'jpeg', 'webp'].some((ext) => lower.endsWith(`.${ext}`))) {
      return (
        <ImageViewer
          key={selectedFile}
          filePath={selectedFile}
          base64Data={fileContent}
          mimeType={mimeType}
          onOpenInDesktop={handleEditInDesktop}
        />
      );
    }

    // 5. Markdown Notes (with LaTeX Doppler math)
    if (lower.endsWith('.md')) {
      return (
        <MarkdownViewer
          key={selectedFile}
          filePath={selectedFile}
          content={fileContent}
          onSave={handleSaveMarkdownNote}
          onOpenInDesktop={handleEditInDesktop}
        />
      );
    }

    // 6. Source Code, JSON, TOML, YAML, Scripts, Configs & Plain Text
    if (!isBinary) {
      return (
        <CodeViewer
          key={selectedFile}
          filePath={selectedFile}
          content={fileContent}
          onSave={handleSaveMarkdownNote}
          onOpenInDesktop={handleEditInDesktop}
        />
      );
    }

    // Fallback for unknown file types
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-500">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-200">{selectedFile}</h3>
          <p className="text-xs text-slate-500 max-w-sm font-sans">Binary format. Open in your default system application to inspect.</p>
        </div>
        <button
          onClick={handleEditInDesktop}
          className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 hover:text-white text-xs font-sans font-medium transition-all active:scale-[0.98]"
        >
          Open with System Default App
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-obsidian-950 overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <FileSidebar
        files={files}
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
        onReturnToHub={onReturnToHub}
        onRefresh={onRefreshFiles}
        isSyncing={isSyncing}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Action Bar */}
        <TopActionBar
          currentPath={selectedFile ? selectedFile.split(/[/\\]/).slice(0, -1).join('/') : ''}
          selectedFile={selectedFile}
          isEditMorphed={isEditMorphed}
          onImportFiles={handleImportFiles}
          onImportFolder={handleImportFolder}
          onCreateNote={handleCreateNote}
          onEditInDesktop={handleEditInDesktop}
          onSaveAndShare={handleSaveAndShare}
          onSyncDrive={handleSyncFromDrive}
          onOpenSettings={onOpenSettings}
          isSyncing={isSyncing}
          isDriveSyncing={isDriveSyncing}
          showToast={showToast}
        />

        {/* Central Document Viewer Viewport */}
        <div className="flex-1 w-full h-full overflow-hidden relative">
          <ErrorBoundary onReset={() => selectedFile && loadFile(selectedFile)}>
            {renderActiveViewer()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};
