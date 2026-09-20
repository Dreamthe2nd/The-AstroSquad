import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sliders, 
  FolderGit2, 
  MessageSquare, 
  FolderOpen, 
  FileSpreadsheet, 
  Presentation, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles, 
  ExternalLink, 
  Save,
  Video,
  Lock,
  Monitor,
  Globe,
  Layers,
  Info
} from 'lucide-react';
import { StationSettings, AuthStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: StationSettings, repoChanged: boolean) => void;
  showToast: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
  authStatus?: AuthStatus | null;
}

type TabType = 'apps' | 'repo' | 'discord' | 'meeting';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  showToast,
  authStatus
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [settings, setSettings] = useState<StationSettings | null>(null);
  const [initialRepoPath, setInitialRepoPath] = useState<string>('');
  const [initialRepoUrl, setInitialRepoUrl] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [browserInfo, setBrowserInfo] = useState<{
    browsers: Array<{ id: string; name: string; path: string | null; supportsAppMode: boolean; platform: string }>;
    platform: string;
    hasVivaldi: boolean;
    hasChrome: boolean;
    hasSafari: boolean;
    hasEdge: boolean;
    hasBrave: boolean;
    hasObsidian?: boolean;
    obsidianPath?: string | null;
    hasGoogleDrive?: boolean;
    googleDrivePath?: string | null;
  } | null>(null);

  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean;
    userEmail?: string;
    userName?: string;
    clientIdConfigured: boolean;
    folderId: string;
  } | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [clientSecretInput, setClientSecretInput] = useState<string>('');
  const [showDriveInstructions, setShowDriveInstructions] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadBrowserInfo();
    }
  }, [isOpen]);

  const loadBrowserInfo = async () => {
    try {
      const info = await window.api.shell.getDetectedBrowsers();
      setBrowserInfo(info);
    } catch (err) {
      console.warn('Could not detect local browsers:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await window.api.settings.getSettings();
      setSettings(s);
      setInitialRepoPath(s.repository.localPath);
      setInitialRepoUrl(s.repository.url);
      if (s.googleSuite?.clientId) {
        setClientIdInput(s.googleSuite.clientId);
      }
      if (s.googleSuite?.clientSecret) {
        setClientSecretInput(s.googleSuite.clientSecret);
      }
      try {
        const dStatus = await window.api.drive.getStatus();
        setDriveStatus(dStatus);
      } catch (e) {
        console.warn('Could not load Google Drive status:', e);
      }
    } catch (err: any) {
      showToast('error', 'Settings Load Error', err.message);
    }
  };

  if (!isOpen || !settings) return null;

  const handleLaunchGoogleSuite = async (appType: 'docs' | 'sheets' | 'slides' | 'drive') => {
    try {
      showToast('info', 'Launching Session', `Opening session for Google ${appType.charAt(0).toUpperCase() + appType.slice(1)}...`);
      const mode = settings.googleSuite?.windowMode || 'station_window';
      const engine = settings.googleSuite?.engine || 'auto';
      const res = await window.api.shell.openGoogleSuite({
        appType,
        windowMode: mode,
        preferredEngine: engine
      });
      if (res && res.message) {
        showToast('success', 'Google Session Active', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Launch Failed', err.message);
    }
  };

  const handleConnectGoogleDrive = async () => {
    if (!clientIdInput.trim()) {
      showToast('error', 'Client ID Required', 'Please provide a Google Cloud OAuth 2.0 Client ID (Desktop Application type).');
      return;
    }

    setIsConnectingDrive(true);
    try {
      showToast('info', 'Starting Authorization', 'Opening Google Sign-In in your default browser. Complete authorization to connect...');
      const res = await window.api.drive.startAuth({
        clientId: clientIdInput.trim(),
        clientSecret: clientSecretInput.trim() || undefined
      });

      if (res.success) {
        showToast('success', 'Google Drive Connected', res.message);
        const updatedStatus = await window.api.drive.getStatus();
        setDriveStatus(updatedStatus);
        const updatedSettings = await window.api.settings.getSettings();
        setSettings(updatedSettings);
      } else {
        showToast('error', 'Connection Failed', res.message);
      }
    } catch (err: any) {
      showToast('error', 'Google Drive Auth Error', err.message || 'Authorization failed.');
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    try {
      await window.api.drive.disconnect();
      showToast('info', 'Google Drive Disconnected', 'Disconnected Google Drive API.');
      const updatedStatus = await window.api.drive.getStatus();
      setDriveStatus(updatedStatus);
      const updatedSettings = await window.api.settings.getSettings();
      setSettings(updatedSettings);
    } catch (err: any) {
      showToast('error', 'Disconnect Error', err.message);
    }
  };

  const handleSetGoogleApp = (filetypeKey: keyof StationSettings['fileAssociations'], googleKey: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fileAssociations: {
          ...prev.fileAssociations,
          [filetypeKey]: googleKey
        }
      };
    });
    if (googleKey) {
      const appName = googleKey.replace('google_', '');
      showToast('success', 'Association Updated', `Assigned .${filetypeKey} to Google ${appName.charAt(0).toUpperCase() + appName.slice(1)} (Standalone Session).`);
    } else {
      showToast('info', 'Association Reset', `Reset .${filetypeKey} to system default.`);
    }
  };

  const handleBrowseApp = async (filetypeKey: keyof StationSettings['fileAssociations']) => {
    try {
      const selected = await window.api.settings.browseApp();
      if (selected) {
        setSettings((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            fileAssociations: {
              ...prev.fileAssociations,
              [filetypeKey]: selected
            }
          };
        });
        showToast('info', 'Application Selected', `Assigned ${selected.split(/[/\\]/).pop()} for .${filetypeKey}`);
      }
    } catch (err: any) {
      showToast('error', 'Browse Error', err.message);
    }
  };

  const handleClearApp = (filetypeKey: keyof StationSettings['fileAssociations']) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fileAssociations: {
          ...prev.fileAssociations,
          [filetypeKey]: ''
        }
      };
    });
  };

  const handleBrowseRepoFolder = async () => {
    try {
      const folder = await window.api.settings.browseRepoDir();
      if (folder) {
        setSettings((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            repository: {
              ...prev.repository,
              localPath: folder
            }
          };
        });
      }
    } catch (err: any) {
      showToast('error', 'Folder Selection Error', err.message);
    }
  };

  const handleResetToAstroSquadRepo = () => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        repository: {
          url: 'https://github.com/Dreamthe2nd/The-AstroSquad',
          localPath: prev.repository.localPath,
          branch: 'main'
        }
      };
    });
    showToast('info', 'Repository Preset', 'Reset remote target to official AstroSquad repository.');
  };

  const handleResetDiscord = () => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        discord: {
          inviteUrl: 'https://discord.gg/yk7cgnd6E',
          appUri: 'discord://discord.com/channels/1545465896481333258'
        }
      };
    });
    showToast('info', 'Discord Preset', 'Reset communications to AstroSquad server.');
  };

  const handleTestDiscord = async () => {
    try {
      showToast('info', 'Testing Discord', 'Launching The-AstroSquad Discord server...');
      await window.api.shell.openDiscord(settings?.discord.inviteUrl, settings?.discord.appUri);
    } catch (err: any) {
      showToast('error', 'Discord Test Failed', err.message);
    }
  };

  const handleTestMeeting = async () => {
    try {
      const url = settings?.meeting?.url || 'https://meet.google.com/new';
      showToast('info', 'Testing Meeting Room', `Opening ${url}...`);
      await window.api.shell.openMeeting(url);
    } catch (err: any) {
      showToast('error', 'Meeting Test Failed', err.message);
    }
  };

  const handleResetMeeting = () => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        meeting: {
          url: 'https://meet.google.com/new',
          platform: 'google_meet'
        }
      };
    });
    showToast('info', 'Meeting Reset', 'Restored default Google Meet room link.');
  };

  const handleResetAll = async () => {
    try {
      const reset = await window.api.settings.resetSettings();
      setSettings(reset);
      try {
        const dStatus = await window.api.drive.getStatus();
        setDriveStatus(dStatus);
      } catch {}
      showToast('info', 'Settings Reset', 'All settings restored to default values.');
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await window.api.settings.saveSettings(settings);
      const repoChanged =
        updated.repository.localPath !== initialRepoPath ||
        updated.repository.url !== initialRepoUrl;

      showToast('success', 'Settings Saved', 'Station configuration has been updated and applied.');
      if (onSettingsSaved) {
        onSettingsSaved(updated, repoChanged);
      }
      onClose();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-rose-500 p-0.5 shadow-doppler-blue">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Settings className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Station Mission Settings
              </h2>
              <p className="text-[11px] font-mono text-cyan-400/80">
                Configure default applications, repositories, and comms links
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30 text-xs font-mono">
          <button
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 font-semibold transition-all ${
              activeTab === 'apps'
                ? 'border-cyan-400 text-cyan-300 bg-slate-850/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filetype Apps</span>
          </button>

          <button
            onClick={() => setActiveTab('repo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 font-semibold transition-all ${
              activeTab === 'repo'
                ? 'border-cyan-400 text-cyan-300 bg-slate-850/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Repository & Clones</span>
          </button>

          <button
            onClick={() => setActiveTab('discord')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 font-semibold transition-all ${
              activeTab === 'discord'
                ? 'border-cyan-400 text-cyan-300 bg-slate-850/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Discord Comms</span>
          </button>

          <button
            onClick={() => setActiveTab('meeting')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 font-semibold transition-all ${
              activeTab === 'meeting'
                ? 'border-cyan-400 text-cyan-300 bg-slate-850/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>Meetings & Video</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-mono">
          {/* TAB 1: FILE ASSOCIATIONS */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-slate-300 leading-relaxed font-sans text-xs">
                Configure which desktop program opens when clicking <span className="font-mono text-cyan-300 font-bold">Edit</span> or <span className="font-mono text-cyan-300 font-bold">Open in Desktop App</span>. You can choose your default desktop app (PowerPoint / Excel), standalone local sessions of the <strong className="text-amber-300 font-semibold">Google Productivity Suite</strong>, or any custom <code className="text-cyan-400 font-mono">.exe</code>.
              </div>

              {/* Google Drive Desktop Status & Workspace Switcher */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3.5 shadow-lg shadow-indigo-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs">Google Drive &amp; Workspace Integration</h4>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold border ${
                          browserInfo?.hasGoogleDrive
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}>
                          {browserInfo?.hasGoogleDrive ? '● Google Drive Desktop Active' : 'Desktop Drive Not Detected'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {browserInfo?.hasGoogleDrive
                          ? `Linked to ${browserInfo.googleDrivePath || 'G:\\My Drive\\The-AstroSquad'}. Local presentations and catalogs sync automatically.`
                          : 'Google Drive for Desktop enables automatic cloud sync and 1-click Google Slides / Sheets editing.'}
                      </p>
                    </div>
                  </div>

                  {browserInfo?.hasGoogleDrive && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await window.api.shell.openGoogleDriveFolder();
                        } catch (err: any) {
                          showToast('error', 'Open Folder Failed', err.message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Reveal local Google Drive folder in Windows Explorer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Open Drive Folder</span>
                    </button>
                  )}
                </div>

                {/* 3-Way Window Display Mode Switcher */}
                <div className="pt-2 border-t border-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Google Workspace Window Mode:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      Select how Google Slides, Sheets, and Docs launch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Mode 1: Standalone App Window */}
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((prev) => prev ? {
                          ...prev,
                          googleSuite: {
                            ...prev.googleSuite,
                            windowMode: 'app_window'
                          }
                        } : prev);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        (settings.googleSuite?.windowMode ?? 'app_window') === 'app_window'
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center gap-1.5 text-white">
                          <Monitor className="w-3 h-3 text-emerald-400" />
                          Standalone App
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-500/30">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Dedicated PWA window via Chrome, Edge, or Brave without browser toolbars.
                      </p>
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold">
                        {(settings.googleSuite?.windowMode ?? 'app_window') === 'app_window' ? '✓ Selected' : 'Select'}
                      </span>
                    </button>

                    {/* Mode 2: Browser Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((prev) => prev ? {
                          ...prev,
                          googleSuite: {
                            ...prev.googleSuite,
                            windowMode: 'browser_tab'
                          }
                        } : prev);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        settings.googleSuite?.windowMode === 'browser_tab'
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center gap-1.5 text-white">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          Browser Tab
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-semibold border border-cyan-500/30">
                          Default OS
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Opens directly as a standard tab in your default browser (Vivaldi, Chrome, Edge).
                      </p>
                      <span className="text-[9px] font-mono text-cyan-400 font-semibold">
                        {settings.googleSuite?.windowMode === 'browser_tab' ? '✓ Selected' : 'Select'}
                      </span>
                    </button>

                    {/* Mode 3: Station Window */}
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((prev) => prev ? {
                          ...prev,
                          googleSuite: {
                            ...prev.googleSuite,
                            windowMode: 'station_window'
                          }
                        } : prev);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        settings.googleSuite?.windowMode === 'station_window'
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center gap-1.5 text-white">
                          <Layers className="w-3 h-3 text-amber-400" />
                          Station Window
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-300 font-semibold border border-amber-500/30">
                          Embedded
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Integrated native desktop window inside the station container.
                      </p>
                      <span className="text-[9px] font-mono text-amber-400 font-semibold">
                        {settings.googleSuite?.windowMode === 'station_window' ? '✓ Selected' : 'Select'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PPTX Association */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-950/80 border border-amber-500/30 text-amber-400">
                      <Presentation className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-200">Presentation Decks (.pptx)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      PowerPoint / Google Slides
                    </span>
                  </div>
                  {settings.fileAssociations.pptx && (
                    <button
                      onClick={() => handleClearApp('pptx')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                    >
                      Reset to System Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="System Default (e.g. PowerPoint or OS association)"
                    value={
                      settings.fileAssociations.pptx === 'google_slides'
                        ? '⚡ Google Slides (Dedicated Standalone Session via Local App Engine)'
                        : settings.fileAssociations.pptx || ''
                    }
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate font-mono"
                  />
                  <button
                    onClick={() => handleBrowseApp('pptx')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse .exe...</span>
                  </button>
                </div>

                {/* Quick Presets for PPTX */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-sans">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleClearApp('pptx')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans transition-colors ${
                      !settings.fileAssociations.pptx
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Default (PowerPoint)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGoogleApp('pptx', 'google_slides')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 transition-colors ${
                      settings.fileAssociations.pptx === 'google_slides'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                    }`}
                  >
                    <span>⚡ Google Slides (Local Session)</span>
                  </button>
                  {settings.fileAssociations.pptx === 'google_slides' && (
                    <button
                      type="button"
                      onClick={() => handleLaunchGoogleSuite('slides')}
                      className="ml-auto text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline"
                      title="Test launch standalone Google Slides session"
                    >
                      <span>▶ Test Launch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PDF Association */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-rose-950/80 border border-rose-500/30 text-rose-400">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-200">PDF Documents &amp; Proposal (.pdf)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Google Docs / Acrobat / Preview
                    </span>
                  </div>
                  {settings.fileAssociations.pdf && (
                    <button
                      onClick={() => handleClearApp('pdf')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                    >
                      Reset to System Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="System Default (Acrobat, Edge, Preview, Foxit)"
                    value={
                      settings.fileAssociations.pdf === 'google_docs'
                        ? '⚡ Google Docs (Dedicated Standalone Session via Local App Engine)'
                        : settings.fileAssociations.pdf || ''
                    }
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate font-mono"
                  />
                  <button
                    onClick={() => handleBrowseApp('pdf')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
                  </button>
                </div>

                {/* Quick Presets for PDF */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-sans">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleClearApp('pdf')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans transition-colors ${
                      !settings.fileAssociations.pdf
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Default (OS Reader)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGoogleApp('pdf', 'google_docs')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 transition-colors ${
                      settings.fileAssociations.pdf === 'google_docs'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
                    }`}
                  >
                    <span>⚡ Google Docs (Local Session)</span>
                  </button>
                  {settings.fileAssociations.pdf === 'google_docs' && (
                    <button
                      type="button"
                      onClick={() => handleLaunchGoogleSuite('docs')}
                      className="ml-auto text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 underline"
                      title="Test launch standalone Google Docs session"
                    >
                      <span>▶ Test Launch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Markdown Association */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                      <FileCode className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-200">Markdown Notes (.md)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-300 font-semibold">
                      Obsidian Recommended
                    </span>
                  </div>
                  {settings.fileAssociations.md && (
                    <button
                      onClick={() => handleClearApp('md')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                    >
                      Reset to System Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="In-App Editor / System Default"
                    value={
                      settings.fileAssociations.md === 'obsidian'
                        ? '⚡ Obsidian (Markdown Knowledge Base & Notes)'
                        : settings.fileAssociations.md || ''
                    }
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate font-mono"
                  />
                  <button
                    onClick={() => handleBrowseApp('md')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
                  </button>
                </div>

                {/* Quick Presets for Markdown */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-sans">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleClearApp('md')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans transition-colors ${
                      !settings.fileAssociations.md
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    In-App Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => prev ? {
                        ...prev,
                        fileAssociations: {
                          ...prev.fileAssociations,
                          md: 'obsidian'
                        }
                      } : prev);
                      showToast('success', 'Obsidian Configured', 'Assigned .md files to launch in Obsidian.');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 transition-colors ${
                      settings.fileAssociations.md === 'obsidian'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-purple-300 border border-slate-800'
                    }`}
                  >
                    <span>⚡ Obsidian {browserInfo?.hasObsidian ? '(Detected)' : '(Recommended)'}</span>
                  </button>
                </div>
              </div>

              {/* CSV Association */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-teal-950/80 border border-teal-500/30 text-teal-400">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-200">Data Catalogs (.csv)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Excel / Google Sheets / Calc
                    </span>
                  </div>
                  {settings.fileAssociations.csv && (
                    <button
                      onClick={() => handleClearApp('csv')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                    >
                      Reset to System Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="In-App Editor (Built-in — No Excel Required)"
                    value={
                      settings.fileAssociations.csv === 'google_sheets'
                        ? '⚡ Google Sheets (Cloud Hub Session via Browser)'
                        : settings.fileAssociations.csv || 'In-App Editor (Built-in — No Excel Required)'
                    }
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate font-mono"
                  />
                  <button
                    onClick={() => handleBrowseApp('csv')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
                  </button>
                </div>

                {/* Quick Presets for CSV */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-sans">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleClearApp('csv')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans transition-colors ${
                      !settings.fileAssociations.csv
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    In-App Editor (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetGoogleApp('csv', 'google_sheets')}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 transition-colors ${
                      settings.fileAssociations.csv === 'google_sheets'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-teal-300 border border-slate-800'
                    }`}
                  >
                    <span>⚡ Google Sheets (Cloud Hub)</span>
                  </button>
                  {settings.fileAssociations.csv === 'google_sheets' && (
                    <button
                      type="button"
                      onClick={() => handleLaunchGoogleSuite('sheets')}
                      className="ml-auto text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 underline"
                      title="Test launch Google Sheets session"
                    >
                      <span>▶ Test Launch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Astronomical Images Association */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-200">Astronomical Images (.png, .jpg, .webp)</span>
                  </div>
                  {settings.fileAssociations.images && (
                    <button
                      onClick={() => handleClearApp('images')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline"
                    >
                      Reset to System Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="System Default"
                    value={settings.fileAssociations.images || ''}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate"
                  />
                  <button
                    onClick={() => handleBrowseApp('images')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REPOSITORY CONFIGURATION */}
          {activeTab === 'repo' && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-slate-300 leading-relaxed font-sans text-xs">
                Switch or target any GitHub repository or local research directory. The station automatically synchronizes, watches, and renders files from the specified target.
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-cyan-400" />
                    <span>Remote GitHub Repository URL:</span>
                  </label>
                  <button
                    onClick={handleResetToAstroSquadRepo}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Use Official AstroSquad Repo
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="https://github.com/Dreamthe2nd/The-AstroSquad"
                  value={settings.repository.url}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, repository: { ...prev.repository, url: e.target.value } } : prev
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <span>Local Working Directory Path:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.repository.localPath}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev ? { ...prev, repository: { ...prev.repository, localPath: e.target.value } } : prev
                      )
                    }
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-400 font-mono truncate"
                  />
                  <button
                    onClick={handleBrowseRepoFolder}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse Folder...</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>Target Git Branch:</span>
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={settings.repository.branch}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, repository: { ...prev.repository, branch: e.target.value } } : prev
                    )
                  }
                  className="w-48 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DISCORD COMMS CONFIGURATION */}
          {activeTab === 'discord' && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-slate-300 leading-relaxed font-sans text-xs">
                Customize the Discord server communications channel. You can update both the web browser invitation link and the desktop application direct URI.
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-indigo-400" />
                    <span>Discord Web Invite URL:</span>
                  </label>
                  <button
                    onClick={handleResetDiscord}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Reset to AstroSquad Default
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="https://discord.gg/yk7cgnd6E"
                  value={settings.discord.inviteUrl}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, discord: { ...prev.discord, inviteUrl: e.target.value } } : prev
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Discord App Direct Protocol URI:</span>
                </label>
                <input
                  type="text"
                  placeholder="discord://discord.com/channels/1545465896481333258"
                  value={settings.discord.appUri}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev ? { ...prev, discord: { ...prev.discord, appUri: e.target.value } } : prev
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              {authStatus && !authStatus.authenticated && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Authentication Required: Sign in with GitHub on the station flight deck to test or launch squad comms.</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestDiscord}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Launch Discord Channel</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MEETINGS & VIDEO (Google Meet / Zoom / Custom) */}
          {activeTab === 'meeting' && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-slate-300 leading-relaxed font-sans text-xs">
                Configure your squad's synchronized video briefing link. The <strong className="text-amber-400">Team Briefing</strong> card on the flight deck will launch this room directly in your browser or desktop client.
              </div>

              {/* Service Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-400" />
                  <span>Meeting Platform Service:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              meeting: {
                                ...prev.meeting,
                                platform: 'google_meet',
                                url: prev.meeting?.url && prev.meeting.url !== 'https://zoom.us/join' ? prev.meeting.url : 'https://meet.google.com/new'
                              }
                            }
                          : prev
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      settings.meeting?.platform === 'google_meet'
                        ? 'bg-amber-950 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Google Meet
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              meeting: {
                                ...prev.meeting,
                                platform: 'zoom',
                                url: prev.meeting?.url && prev.meeting.url !== 'https://meet.google.com/new' ? prev.meeting.url : 'https://zoom.us/join'
                              }
                            }
                          : prev
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      settings.meeting?.platform === 'zoom'
                        ? 'bg-blue-950 border-blue-400 text-blue-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Zoom
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              meeting: {
                                ...prev.meeting,
                                platform: 'custom'
                              }
                            }
                          : prev
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      settings.meeting?.platform === 'custom'
                        ? 'bg-purple-950 border-purple-400 text-purple-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom Provider
                  </button>
                </div>
              </div>

              {/* Meeting URL Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                    <span>Meeting Room URL / Link:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleResetMeeting}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                  >
                    Reset to Default Meet Link
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={
                    settings.meeting?.platform === 'zoom'
                      ? 'https://zoom.us/j/1234567890?pwd=...'
                      : 'https://meet.google.com/abc-defg-hij'
                  }
                  value={settings.meeting?.url || ''}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            meeting: {
                              url: e.target.value,
                              platform: prev.meeting?.platform || 'google_meet'
                            }
                          }
                        : prev
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-400 font-mono"
                />
                <p className="text-[11px] text-slate-400 font-sans">
                  Paste your team's Google Meet room URL or Zoom meeting link. You can change this link at any time.
                </p>
              </div>

              {authStatus && !authStatus.authenticated && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs font-mono text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Authentication Required: Sign in with GitHub on the station flight deck to test or join squad video briefings.</span>
                </div>
              )}

              {/* Test Launch Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestMeeting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
                  <span>Test Launch Meeting Room</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60 font-mono text-xs">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-400 transition-colors"
            title="Reset all settings to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-bold flex items-center gap-2 shadow-doppler-blue transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
