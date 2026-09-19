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
  Video
} from 'lucide-react';
import { StationSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: StationSettings, repoChanged: boolean) => void;
  showToast: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
}

type TabType = 'apps' | 'repo' | 'discord' | 'meeting';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [settings, setSettings] = useState<StationSettings | null>(null);
  const [initialRepoPath, setInitialRepoPath] = useState<string>('');
  const [initialRepoUrl, setInitialRepoUrl] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const s = await window.api.settings.getSettings();
      setSettings(s);
      setInitialRepoPath(s.repository.localPath);
      setInitialRepoUrl(s.repository.url);
    } catch (err: any) {
      showToast('error', 'Settings Load Error', err.message);
    }
  };

  if (!isOpen || !settings) return null;

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
      showToast('info', 'Testing Discord', 'Launching configured Discord channel...');
      await window.api.shell.openDiscord();
    } catch (err: any) {
      showToast('error', 'Discord Test Failed', err.message);
    }
  };

  const handleTestMeeting = async () => {
    try {
      const url = settings?.meeting?.url || 'https://meet.google.com/new';
      showToast('info', 'Testing Meeting Room', `Opening ${url}...`);
      await window.api.shell.openMeeting();
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
                Configure which desktop program opens when clicking <span className="font-mono text-cyan-300 font-bold">Edit</span> or <span className="font-mono text-cyan-300 font-bold">Open in Desktop App</span>. If unassigned, the station defaults to your operating system's registered handler.
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
                      e.g. LibreOffice Impress / WPS / Keynote
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
                    value={settings.fileAssociations.pptx || ''}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate"
                  />
                  <button
                    onClick={() => handleBrowseApp('pptx')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse .exe...</span>
                  </button>
                </div>
              </div>

              {/* PDF Association */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-rose-950/80 border border-rose-500/30 text-rose-400">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-slate-200">PDF Documents & Proposal (.pdf)</span>
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
                    value={settings.fileAssociations.pdf || ''}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate"
                  />
                  <button
                    onClick={() => handleBrowseApp('pdf')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
                  </button>
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      e.g. Obsidian, VS Code, Typora
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
                    placeholder="System Default"
                    value={settings.fileAssociations.md || ''}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate"
                  />
                  <button
                    onClick={() => handleBrowseApp('md')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
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
                      e.g. LibreOffice Calc, Excel
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
                    placeholder="System Default"
                    value={settings.fileAssociations.csv || ''}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs truncate"
                  />
                  <button
                    onClick={() => handleBrowseApp('csv')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse .exe...</span>
                  </button>
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
