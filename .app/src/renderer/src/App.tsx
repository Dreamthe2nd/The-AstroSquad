import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { FlightDeckHub } from './components/FlightDeckHub';
import { Workspace } from './components/Workspace';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { AuthStatus, FileNode, StationSettings, ToastNotification, ViewMode } from './types';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [initialFileToOpen, setInitialFileToOpen] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Toast helper
  const showToast = (
    type: 'info' | 'success' | 'warning' | 'error' | 'conflict',
    title: string,
    message: string
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastNotification = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    const duration = type === 'conflict' ? 8000 : 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check auth status on app start
  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    try {
      const status = await window.api.auth.getAuthStatus();
      setAuthStatus(status);
      if (status && status.authenticated) {
        setViewMode('hub');
      } else {
        setViewMode('auth');
      }
    } catch {
      setViewMode('auth');
    }
  };

  const refreshFiles = async () => {
    try {
      const tree = await window.api.fs.listFiles();
      setFiles(tree);
    } catch (err: any) {
      console.error('Failed to list files:', err);
    }
  };

  // Transition from Auth -> Hub
  const handleAuthenticated = async () => {
    const status = await window.api.auth.getAuthStatus();
    setAuthStatus(status);
    setViewMode('hub');
  };

  // 1. "View Repository" action from Hub
  const handleEnterWorkspace = async () => {
    try {
      // Silent background pull from main
      const syncRes = await window.api.git.syncRepository();
      if (syncRes && syncRes.conflictsResolved && syncRes.conflictsResolved.length > 0) {
        showToast(
          'conflict',
          'Guardrail Protected Edits',
          `Remote updates pulled. Preserved ${syncRes.conflictsResolved.length} modified file(s) as [name]_conflict_[timestamp].`
        );
      } else if (syncRes && syncRes.success) {
        showToast('success', 'Station Synced', syncRes.message);
      }
    } catch (err: any) {
      console.warn('Silent sync error (proceeding to local workspace):', err);
      showToast('warning', 'Offline Mode', 'Could not reach GitHub. Working with local repository cache.');
    }

    await refreshFiles();
    setInitialFileToOpen('README.md');
    setViewMode('workspace');
  };

  // 3. "View Proposal" quick-access from Hub
  const handleOpenProposal = async () => {
    try {
      // Silent background pull from main
      await window.api.git.syncRepository();
    } catch (err: any) {
      console.warn('Silent sync error (proceeding to local proposal):', err);
    }

    const tree = await window.api.fs.listFiles();
    setFiles(tree || []);

    // Locate proposal file: either 'Proposal', 'proposal.pdf', or in subdirs
    const findProposal = (nodes: FileNode[]): string | null => {
      if (!nodes) return null;
      for (const node of nodes) {
        if (!node.isDirectory) {
          const lower = node.name.toLowerCase();
          if (lower === 'proposal' || lower === 'proposal.pdf' || lower.includes('proposal')) {
            return node.relativePath;
          }
        } else if (node.children) {
          const found = findProposal(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const proposalPath = findProposal(tree || []) || 'Proposal';
    setInitialFileToOpen(proposalPath);
    setViewMode('workspace');
  };

  // Logout action
  const handleLogout = async () => {
    await window.api.auth.logout();
    setAuthStatus(null);
    setViewMode('auth');
    showToast('info', 'Station Disconnected', 'Logged out and returned to authentication.');
  };

  // Handle settings saved
  const handleSettingsSaved = async (newSettings: StationSettings, repoChanged: boolean) => {
    if (repoChanged) {
      showToast(
        'info',
        'Switching Repository',
        `Target updated to ${newSettings.repository.localPath}. Refreshing file index...`
      );
      await refreshFiles();
      if (viewMode === 'workspace') {
        setInitialFileToOpen('README.md');
      }
    }
  };

  return (
    <div className="w-screen h-screen bg-obsidian-950 text-slate-100 overflow-hidden relative">
      {viewMode === 'auth' && (
        <AuthScreen
          onAuthenticated={handleAuthenticated}
          showToast={showToast}
        />
      )}

      {viewMode === 'hub' && (
        <FlightDeckHub
          authStatus={authStatus}
          onEnterWorkspace={handleEnterWorkspace}
          onOpenProposal={handleOpenProposal}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          showToast={showToast}
        />
      )}

      {viewMode === 'workspace' && (
        <Workspace
          files={files}
          initialSelectedFile={initialFileToOpen}
          onReturnToHub={() => setViewMode('hub')}
          onRefreshFiles={refreshFiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          showToast={showToast}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={handleSettingsSaved}
        showToast={showToast}
        authStatus={authStatus}
        onLogout={handleLogout}
      />

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
