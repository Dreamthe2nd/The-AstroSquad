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

  const handleEditInDesktop = async () => {
    if (!selectedFile) return;

    setIsSyncing(true);
    try {
      // 1. Pull remote changes to ensure fresh data
      showToast('info', 'Pre-Edit Sync', 'Checking mission control for latest remote updates...');
      const syncRes = await window.api.git.syncRepository();
      if (syncRes.conflictsResolved && syncRes.conflictsResolved.length > 0) {
        showToast('conflict', 'Guardrail Alert', `Conflict resolved: Local edits backed up to preserve work.`);
      }

      // 2. Launch file in local desktop app
      showToast('info', 'Opening Desktop App', `Launching ${selectedFile.split(/[/\\]/).pop()} in configured application...`);
      const openResult = await window.api.fs.openInDesktopApp(selectedFile);
      if (openResult) {
        const isSuccess = openResult.toLowerCase().includes('launched') || openResult.toLowerCase().includes('opened');
        showToast(isSuccess ? 'success' : 'info', 'App Launch Active', openResult);
      }

      // 3. Temporarily morph button into glowing "Save & Share"
      setIsEditMorphed(true);
    } catch (err: any) {
      showToast('error', 'Edit Launch Failed', err.message);
    } finally {
      setIsSyncing(false);
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
        <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
          <Orbit className="w-12 h-12 text-slate-700 animate-spin" style={{ animationDuration: '20s' }} />
          <p className="text-xs font-mono">Select a file from the repository sidebar to view spectra or documents.</p>
        </div>
      );
    }

    if (isLoadingFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs font-mono">Loading telemetry payload...</p>
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
          onOpenInDesktop={handleEditInDesktop}
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
          onOpenInDesktop={handleEditInDesktop}
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
          onOpenInDesktop={handleEditInDesktop}
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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <FileQuestion className="w-12 h-12 text-slate-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-300">{selectedFile}</h3>
          <p className="text-xs text-slate-500 mt-1">Binary format. Launch in desktop app to inspect.</p>
        </div>
        <button
          onClick={handleEditInDesktop}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
        >
          Open with System Default App
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
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
          onOpenSettings={onOpenSettings}
          isSyncing={isSyncing}
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
