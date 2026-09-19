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
  Video
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
  const [loadingAction, setLoadingAction] = useState<'repo' | 'discord' | 'proposal' | 'meeting' | null>(null);
  const [showProposalMatrix, setShowProposalMatrix] = useState<boolean>(true);

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
      showToast('info', 'Connecting to Discord', 'Opening AstroSquad server in app or browser...');
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
      await window.api.shell.openMeeting();
      showToast('info', 'Joining Meeting Room', 'Opening video conference in browser or desktop...');
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

  // Open Local Repo Folder in OS Explorer
  const handleOpenFolder = async () => {
    try {
      await window.api.shell.openRepoFolder();
    } catch (err: any) {
      showToast('error', 'Folder Open Failed', err.message);
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-8 overflow-y-auto overflow-x-hidden selection:bg-cyan-500/30">
      {/* 3D Vertically Rotating Doppler Waves (Blue M31 Blueshift & Red M82 Redshift) */}
      <DopplerWavesBackground />

      {/* Top Station Flight Deck Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-rose-500 p-0.5 shadow-doppler-glow">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Orbit className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                AstroSquad Research Station
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-400 font-semibold">
                MAIN DECK
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Experimental Methods: Comparative Spectroscopic Analysis of Galaxies M82 &amp; M31
            </p>
          </div>
        </div>

        {/* User Info & Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenFolder}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-mono text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Open local AstroSquad directory in Windows Explorer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Local Folder</span>
          </button>

          {authStatus?.authenticated && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium">
                {authStatus.user?.name || authStatus.user?.login || 'Collaborator'}
              </span>
            </div>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors shadow-sm"
            title="Station Mission Settings (Custom Apps, Repositories, Discord)"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors"
            title="Disconnect & Return to Auth"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Hub Content: 3 Primary Cards + Proposal Comparative Matrix */}
      <main className="relative z-10 max-w-6xl w-full mx-auto flex-1 py-8 space-y-6">
        {/* Mission Status Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Spectroscopic Investigation · Galaxies M82 &amp; M31 · Zero-Terminal Synchronizer</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Welcome to the AstroSquad Flight Deck
          </h2>
          <p className="text-sm text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Collaborative workstation for comparative spectroscopy of <strong className="text-rose-400">M82</strong> (Starburst Redshift, Hα &amp; [N II] Outflows) and <strong className="text-cyan-400">M31</strong> (Andromeda Infall Blueshift), data reduction pipelines, and research hypotheses.
          </p>
        </div>

        {/* 4 Primary Cards Grid (Data, Discord, Proposal, Meeting) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: View Repository */}
          <div
            onClick={handleViewRepository}
            className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-cyan-500/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-doppler-blue flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 group-hover:border-cyan-400 group-hover:shadow-doppler-blue transition-all">
                {loadingAction === 'repo' ? (
                  <RefreshCw className="w-7 h-7 animate-spin text-cyan-300" />
                ) : (
                  <FolderGit2 className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Explore Research Data
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-semibold">
                    AUTO-PULL
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Runs a silent background pull from <code className="text-cyan-400 font-mono">main</code> to fetch latest M82 &amp; M31 spectra, reduction notebooks, and logs into the workspace.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span className="font-mono">Enter Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Open Discord Server */}
          <div
            onClick={handleOpenDiscord}
            className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-indigo-500/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 group-hover:border-indigo-400 transition-all">
                {loadingAction === 'discord' ? (
                  <RefreshCw className="w-7 h-7 animate-spin text-indigo-300" />
                ) : (
                  <MessageSquare className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Squad Comms
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-400 font-semibold">
                    DISCORD
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Collaborate live with Shlok, Annushka, Keya, and Sheetal to plan Takahashi &amp; Meade Cassegrain telescope observation runs.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span className="font-mono">Launch Comms</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: View Proposal */}
          <div
            onClick={handleViewProposal}
            className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-rose-500/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-doppler-red flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full pointer-events-none group-hover:bg-rose-500/10 transition-colors" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-110 group-hover:border-rose-400 group-hover:shadow-doppler-red transition-all">
                {loadingAction === 'proposal' ? (
                  <RefreshCw className="w-7 h-7 animate-spin text-rose-300" />
                ) : (
                  <FileText className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                    View Research Proposal
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-500/30 text-rose-400 font-semibold">
                    7-PAGE PDF
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open the official proposal: <span className="text-rose-300 font-semibold italic">"Experimental Methods: Spectroscopic Analysis of galaxies M82 and M31"</span>.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-rose-400">
              <span className="font-mono">Open Proposal PDF</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Team Video Briefing (Yellow Theme - Google Meet / Zoom) */}
          <div
            onClick={handleOpenMeeting}
            className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 hover:border-amber-500/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 group-hover:border-amber-400 transition-all">
                {loadingAction === 'meeting' ? (
                  <RefreshCw className="w-7 h-7 animate-spin text-amber-300" />
                ) : (
                  <Video className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    Team Briefing
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-500/30 text-amber-400 font-semibold">
                    MEET / ZOOM
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant one-click access to the squad's synchronized video briefing room. Compatible with Google Meet and Zoom.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span className="font-mono">Join Meeting Room</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Research Team Banner with Accurate Proposal Targets */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-rose-500/20 border border-slate-700/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  AstroSquad Spectroscopy Team
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  4 Researchers
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">
                Shlok · Annushka · Keya · Sheetal
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Optics: Takahashi 106mm (f/5) · Meade 305mm SCT (f/10) · Czerny-Turner Spectrograph (350nm–1µm)
              </p>
            </div>
          </div>

          {/* Contrasting Targets from Proposal */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Target 1: M82 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span>M82 (Cigar Galaxy)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-900 text-rose-200 border border-rose-400/30">
                    REDSHIFT +203 km/s
                  </span>
                </div>
                <div className="text-[10px] text-rose-400/80">
                  Starburst H II &amp; [N II] Outflows · d ≈ 12 Mly
                </div>
              </div>
            </div>

            {/* Target 2: M31 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span>M31 (Andromeda)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900 text-cyan-200 border border-cyan-400/30">
                    BLUESHIFT -300 km/s
                  </span>
                </div>
                <div className="text-[10px] text-cyan-400/80">
                  Galactic Infall · Stable Spiral · d ≈ 2.5 Mly
                </div>
              </div>
            </div>

            {/* Doppler Equation Badge */}
            <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] font-mono shadow-inner">
              <span className="text-slate-500">Doppler: </span>
              <span className="text-cyan-400 font-bold">z = Δλ / λ₀</span>
              <span className="text-slate-600 mx-2">|</span>
              <span className="text-rose-400 font-bold">v_r = c · z</span>
            </div>
          </div>
        </div>

        {/* Proposal Research Matrix & Hypotheses Panel */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer" onClick={() => setShowProposalMatrix(!showProposalMatrix)}>
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Research Proposal Matrix: M82 vs. M31 Comparative Spectroscopy
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                PROPOSAL.PDF ALIGNED
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProposal();
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-4 flex items-center gap-1"
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
            <div className="p-6 space-y-6">
              {/* Comparative Hypotheses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* M82 Starburst Box */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/30 to-slate-950 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <h4 className="font-bold text-white text-sm">M82 — Starburst Cigar Galaxy</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
                      Redshifted (+v)
                    </span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 font-sans">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      <span><strong>Kinematics:</strong> Accelerating away from relative position of Earth (+203 km/s).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      <span><strong>Atmosphere &amp; Elements:</strong> Abundance of ionized H II &amp; [N II] gases; presence of forbidden H, N, or S lines.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      <span><strong>Star Formation:</strong> Cradle of very hot, bright, young short-lived stars with superwind outflow jets.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      <span><strong>Estimated Distance:</strong> Many million light years (~12 Mly).</span>
                    </li>
                  </ul>
                </div>

                {/* M31 Andromeda Box */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 to-slate-950 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                      <h4 className="font-bold text-white text-sm">M31 — Andromeda Spiral Galaxy</h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      Blueshifted (-v)
                    </span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 font-sans">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span><strong>Kinematics:</strong> Accelerating towards relative position of Earth (-300 km/s).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span><strong>Atmosphere &amp; Elements:</strong> Dominated by classical stellar absorption spectra; absence of starburst ejections.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span><strong>Star Formation:</strong> Relatively stable galaxy; lacks extreme H II burst region signatures.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span><strong>Estimated Distance:</strong> Just a couple of million light years (~2.5 Mly).</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Instrumentation & Reduction Pipeline Strip */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-cyan-400 font-bold tracking-wider">
                    Observation Hardware &amp; Optics (Proposal Spec):
                  </div>
                  <div className="text-slate-300">
                    Takahashi Apo Refractor (106mm / 530mm) · Meade Schmidt-Cassegrain (305mm / 3,048mm) · Computerized GEM · 3D-Printed Czerny-Turner (<span className="text-cyan-400">&lt;350nm to 1µm</span>)
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-rose-400 font-bold tracking-wider">
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
      <footer className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-500 pt-6 pb-6 border-t border-slate-800/60 mt-8 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Non-Technical Guardrail Engine: Zero Git CLI / Automatic Conflict Backups</span>
        </div>
        <div>
          <span>Remote: github.com/Dreamthe2nd/The-AstroSquad</span>
        </div>
      </footer>
    </div>
  );
};
