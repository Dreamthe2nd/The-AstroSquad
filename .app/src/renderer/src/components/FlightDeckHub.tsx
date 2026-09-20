import React, { useState } from 'react';
import { 
  FolderGit2, 
  MessageSquare, 
  FileText, 
  Users, 
  Sparkles, 
  LogOut, 
  ExternalLink, 
  FolderOpen, 
  Orbit, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw, 
  Settings,
  Radio,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Eye,
  Video,
  Lock,
  Key,
  Telescope,
  Globe
} from 'lucide-react';
import { AuthStatus } from '../types';
import { DopplerWavesBackground } from './DopplerWavesBackground';

interface FlightDeckHubProps {
  authStatus: AuthStatus | null;
  onEnterWorkspace: () => Promise<void>;
  onOpenProposal: () => Promise<void>;
  onOpenSettings: () => void;
  onLogout: () => void;
  showToast: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
}

export const FlightDeckHub: React.FC<FlightDeckHubProps> = ({
  authStatus,
  onEnterWorkspace,
  onOpenProposal,
  onOpenSettings,
  onLogout,
  showToast
}) => {
  const [loadingAction, setLoadingAction] = useState<'repo' | 'discord' | 'proposal' | 'meeting' | 'kstars' | 'website' | null>(null);
  const [showProposalMatrix, setShowProposalMatrix] = useState<boolean>(true);
  const isCollaborator = Boolean(authStatus?.authenticated && authStatus?.isCollaborator);

  // 1. View Repository handler
  const handleViewRepository = async () => {
    setLoadingAction('repo');
    try {
      await onEnterWorkspace();
    } catch (err: any) {
      showToast('error', 'Sync Failed', err.message || 'Unable to sync repository.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Open Discord Comms handler
  const handleOpenDiscord = async () => {
    setLoadingAction('discord');
    try {
      await window.api.shell.openDiscord();
    } catch (err: any) {
      showToast('error', 'Discord Launch Failed', err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Open Video Briefing handler (Google Meet / Zoom)
  const handleOpenMeeting = async () => {
    setLoadingAction('meeting');
    try {
      showToast('info', 'Joining Meeting Room', 'Opening synchronized video briefing in default browser...');
      await window.api.shell.openMeeting();
      showToast('success', 'Meeting Active', 'Launched Team Video Briefing room.');
    } catch (err: any) {
      showToast('error', 'Meeting Launch Failed', err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. View Proposal handler
  const handleViewProposal = async () => {
    setLoadingAction('proposal');
    try {
      await onOpenProposal();
    } catch (err: any) {
      showToast('error', 'Proposal Sync Failed', err.message || 'Unable to open proposal.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Open KStars Planetarium handler (Cross-Platform: Mac & Windows)
  const handleOpenKStars = async () => {
    setLoadingAction('kstars');
    try {
      const res = await window.api.shell.openKStars();
      if (res.success) {
        showToast('success', 'KStars Active', res.message || 'Launched KStars planetarium suite.');
      } else {
        showToast('warning', 'KStars Not Found', 'KStars was not detected locally. Opening official download page (kstars.kde.org)...');
        await window.api.shell.openExternal('https://kstars.kde.org/download/');
      }
    } catch (err: any) {
      showToast('error', 'KStars Launch Failed', err.message || 'Unable to launch KStars.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Open thegeekshed.us Website handler
  const handleOpenWebsite = async () => {
    setLoadingAction('website');
    try {
      await window.api.shell.openExternal('https://thegeekshed.us');
      showToast('info', 'The Geek Shed', 'Opening thegeekshed.us in default browser...');
    } catch (err: any) {
      showToast('error', 'Website Launch Failed', err.message || 'Unable to open website.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Open Local Repo Folder in OS Explorer
  const handleOpenFolder = async () => {
    try {
      await window.api.shell.openRepoFolder();
    } catch (err: any) {
      showToast('error', 'Folder Open Failed', err.message);
    }
  };

  return (
    <div className="relative h-full w-full bg-obsidian-950 text-slate-100 flex flex-col justify-between p-6 md:p-8 overflow-y-auto overflow-x-hidden font-sans selection:bg-nothing/30 dot-matrix-bg">
      {/* 3D Vertically Rotating Doppler Waves */}
      <div className="opacity-35 pointer-events-none">
        <DopplerWavesBackground />
      </div>

      {/* Top Station Flight Deck Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-obsidian-900/70 border border-white/[0.08] backdrop-blur-xl shrink-0 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white relative">
            <Orbit className="w-5 h-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nothing" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                AstroSquad Station
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-slate-400 font-medium">
                MAIN DECK
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Experimental Methods: Comparative Spectroscopic Analysis of Galaxies M82 &amp; M31
            </p>
          </div>
        </div>

        {/* User Info & Quick Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenFolder}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-sans text-slate-300 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all active:scale-[0.98]"
            title="Open local AstroSquad directory in Windows Explorer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Folder</span>
          </button>

          {authStatus?.authenticated ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-sans">
              <span className={`w-2 h-2 rounded-full ${isCollaborator ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-slate-200 font-medium">
                {authStatus.user?.name || authStatus.user?.login || 'Collaborator'}
              </span>
              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold ${
                isCollaborator
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
              }`}>
                {isCollaborator ? 'Team' : 'Guest'}
              </span>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-sans text-slate-200 transition-all active:scale-[0.98]"
              title="Click to sign in with GitHub"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-all active:scale-[0.98]"
            title="Station Mission Settings (Custom Apps, Repositories, Discord)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Central Hub Area */}
      <main className="relative z-10 max-w-7xl w-full mx-auto my-auto py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-nothing animate-pulse" />
            <span>Spectroscopic Research Station</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
            Welcome to the AstroSquad Flight Deck
          </h2>
          <p className="text-sm text-slate-400 max-w-3xl mx-auto leading-relaxed font-sans">
            Collaborative workstation for comparative spectroscopy of <strong className="text-nothing-400">M82</strong> (Starburst Redshift, Hα &amp; [N II] Outflows) and <strong className="text-sapphire-400">M31</strong> (Andromeda Infall Blueshift), data reduction pipelines, and research hypotheses.
          </p>
        </div>

        {/* 4 Primary Action Tiles Grid (Data, Discord, Proposal, Meeting) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Tile 1: View Repository */}
          <div
            onClick={handleViewRepository}
            className="group relative cursor-pointer rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.2] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-ambient active:scale-[0.99] flex flex-col justify-between backdrop-blur-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-100 mb-5 group-hover:bg-white/[0.08] transition-all">
                {loadingAction === 'repo' ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <FolderGit2 className="w-6 h-6 text-slate-200" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Research Data
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 font-medium">
                    AUTO-PULL
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Runs background sync from <code className="text-slate-200 font-mono text-[11px]">main</code> to pull latest M82 &amp; M31 spectra, reduction notebooks, and logs.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tile 2: Squad Comms (Discord) */}
          <div
            onClick={handleOpenDiscord}
            className="group relative cursor-pointer rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.2] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-ambient active:scale-[0.99] flex flex-col justify-between backdrop-blur-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-100 mb-5 group-hover:bg-white/[0.08] transition-all">
                {loadingAction === 'discord' ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <MessageSquare className="w-6 h-6 text-slate-200" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Squad Comms
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 font-medium">
                    DISCORD
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Collaborate live with Shlok, Annushka, Keya, and Sheetal to plan Takahashi &amp; Meade telescope observation runs.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
              <span>Launch Discord Comms</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Tile 3: View Proposal */}
          <div
            onClick={handleViewProposal}
            className="group relative cursor-pointer rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.2] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-ambient active:scale-[0.99] flex flex-col justify-between backdrop-blur-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-100 mb-5 group-hover:bg-white/[0.08] transition-all">
                {loadingAction === 'proposal' ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <FileText className="w-6 h-6 text-slate-200" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Research Proposal
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 font-medium">
                    7-PAGE PDF
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Official proposal: <span className="text-slate-200 italic font-medium">"Spectroscopic Analysis of galaxies M82 and M31"</span>.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
              <span>Open Proposal PDF</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tile 4: Team Video Briefing */}
          <div
            onClick={handleOpenMeeting}
            className="group relative cursor-pointer rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.2] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-ambient active:scale-[0.99] flex flex-col justify-between backdrop-blur-xl"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-100 mb-5 group-hover:bg-white/[0.08] transition-all">
                {loadingAction === 'meeting' ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Video className="w-6 h-6 text-slate-200" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Team Briefing
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 font-medium">
                    MEET / ZOOM
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Instant one-click access to the synchronized team briefing room. Compatible with Google Meet and Zoom.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
              <span>Join Video Briefing</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Quick External Actions: KStars Planetarium & The Geek Shed Website */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleOpenKStars}
            disabled={loadingAction === 'kstars'}
            className="group px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.2] text-xs font-sans text-slate-300 hover:text-white flex items-center gap-2 transition-all duration-150 active:scale-[0.98] shadow-sm backdrop-blur-xl disabled:opacity-50"
            title="Launch KStars Planetarium & Telescope Control (macOS & Windows)"
          >
            {loadingAction === 'kstars' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-nothing" />
            ) : (
              <Telescope className="w-3.5 h-3.5 text-sapphire-400 group-hover:text-sapphire-300 transition-colors" />
            )}
            <span className="font-medium">Open KStars</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-white/[0.05] border border-white/[0.08] text-slate-400 group-hover:text-slate-200">
              mac / win
            </span>
          </button>

          <button
            onClick={handleOpenWebsite}
            disabled={loadingAction === 'website'}
            className="group px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.2] text-xs font-sans text-slate-300 hover:text-white flex items-center gap-2 transition-all duration-150 active:scale-[0.98] shadow-sm backdrop-blur-xl disabled:opacity-50"
            title="Visit thegeekshed.us (AstroSquad Portal)"
          >
            {loadingAction === 'website' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-nothing" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            )}
            <span className="font-medium">thegeekshed.us</span>
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </button>
        </div>

        {/* Research Team Banner */}
        <div className="p-5 rounded-2xl bg-obsidian-900/70 border border-white/[0.08] shadow-sm flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  AstroSquad Spectroscopy Team
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                  4 Researchers
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200 mt-0.5 font-sans">
                Shlok · Annushka · Keya · Sheetal
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Optics: Takahashi 106mm (f/5) · Meade 305mm SCT (f/10) · Czerny-Turner Spectrograph (350nm–1µm)
              </p>
            </div>
          </div>

          {/* Contrasting Targets from Proposal */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Target 1: M82 */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-nothing animate-pulse" />
              <div>
                <div className="font-semibold text-xs text-white flex items-center gap-1.5 font-sans">
                  <span>M82 (Cigar Galaxy)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-nothing/20 text-nothing-400 border border-nothing/30">
                    +203 km/s
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Starburst H II &amp; [N II] Outflows · ~12 Mly
                </div>
              </div>
            </div>

            {/* Target 2: M31 */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-sapphire animate-pulse" />
              <div>
                <div className="font-semibold text-xs text-white flex items-center gap-1.5 font-sans">
                  <span>M31 (Andromeda)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sapphire/20 text-sapphire-400 border border-sapphire/30">
                    -300 km/s
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Galactic Infall · Stable Spiral · ~2.5 Mly
                </div>
              </div>
            </div>

            {/* Doppler Equation Badge */}
            <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-slate-300 text-[11px] font-mono shadow-inner">
              <span className="text-slate-500">Doppler: </span>
              <span className="text-sapphire-400 font-medium">z = Δλ / λ₀</span>
              <span className="text-slate-700 mx-2">|</span>
              <span className="text-nothing-400 font-medium">v_r = c · z</span>
            </div>
          </div>
        </div>

        {/* Proposal Research Matrix & Hypotheses Panel */}
        <div className="rounded-2xl bg-obsidian-900/70 border border-white/[0.08] overflow-hidden shadow-sm backdrop-blur-xl">
          <div className="px-6 py-4 bg-obsidian-950/60 border-b border-white/[0.08] flex items-center justify-between cursor-pointer" onClick={() => setShowProposalMatrix(!showProposalMatrix)}>
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-slate-300" />
              <h3 className="text-sm font-bold text-white font-sans uppercase tracking-wide">
                Research Proposal Matrix: M82 vs. M31 Comparative Spectroscopy
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                PROPOSAL.PDF ALIGNED
              </span>
            </div>
            <div className="flex items-center gap-3 font-sans">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProposal();
                }}
                className="text-xs text-slate-300 hover:text-white underline underline-offset-4 flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Read Full Document</span>
              </button>
              {showProposalMatrix ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>

          {showProposalMatrix && (
            <div className="p-6 space-y-6 font-sans">
              {/* Comparative Hypotheses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* M82 Starburst Box */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-nothing"></span>
                      <h4 className="font-bold text-white text-sm font-sans">M82 — Starburst Cigar Galaxy</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nothing/15 text-nothing-400 border border-nothing/30">
                      Redshifted (+v)
                    </span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 font-sans">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-nothing-400 mt-0.5 shrink-0" />
                      <span><strong>Kinematics:</strong> Accelerating away from relative position of Earth (+203 km/s).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-nothing-400 mt-0.5 shrink-0" />
                      <span><strong>Atmosphere &amp; Elements:</strong> Abundance of ionized H II &amp; [N II] gases; presence of forbidden H, N, or S lines.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-nothing-400 mt-0.5 shrink-0" />
                      <span><strong>Star Formation:</strong> Cradle of very hot, bright, young short-lived stars with superwind outflow jets.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-nothing-400 mt-0.5 shrink-0" />
                      <span><strong>Estimated Distance:</strong> Many million light years (~12 Mly).</span>
                    </li>
                  </ul>
                </div>

                {/* M31 Andromeda Box */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sapphire"></span>
                      <h4 className="font-bold text-white text-sm font-sans">M31 — Andromeda Spiral Galaxy</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sapphire/15 text-sapphire-400 border border-sapphire/30">
                      Blueshifted (-v)
                    </span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 font-sans">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sapphire-400 mt-0.5 shrink-0" />
                      <span><strong>Kinematics:</strong> Accelerating towards relative position of Earth (-300 km/s).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sapphire-400 mt-0.5 shrink-0" />
                      <span><strong>Atmosphere &amp; Elements:</strong> Dominated by classical stellar absorption spectra; absence of starburst ejections.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sapphire-400 mt-0.5 shrink-0" />
                      <span><strong>Star Formation:</strong> Relatively stable galaxy; lacks extreme H II burst region signatures.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sapphire-400 mt-0.5 shrink-0" />
                      <span><strong>Estimated Distance:</strong> Just a couple of million light years (~2.5 Mly).</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Instrumentation & Reduction Pipeline Strip */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-slate-300 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-sapphire-400 font-medium tracking-wider">
                    Observation Hardware &amp; Optics (Proposal Spec):
                  </div>
                  <div className="text-slate-300">
                    Takahashi Apo Refractor (106mm / 530mm) · Meade Schmidt-Cassegrain (305mm / 3,048mm) · Computerized GEM · 3D-Printed Czerny-Turner (&lt;350nm to 1µm)
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-nothing-400 font-medium tracking-wider">
                    Data Reduction Protocol:
                  </div>
                  <div className="text-slate-300">
                    Bias/Dark Subtraction → Flat-Field Correction → Argon-Neon Lamp Wavelength Calibration → 1D Spectral Extraction → Flux Normalization
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer telemetry */}
      <footer className="relative z-10 flex items-center justify-between text-xs font-sans text-slate-500 pt-6 pb-6 border-t border-white/[0.08] mt-8 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Non-Technical Guardrail Engine: Zero Git CLI / Automatic Conflict Backups</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          <span>Remote: github.com/Dreamthe2nd/The-AstroSquad</span>
        </div>
      </footer>
    </div>
  );
};
