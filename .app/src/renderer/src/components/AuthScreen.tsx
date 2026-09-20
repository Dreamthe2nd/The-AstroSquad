import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ExternalLink, 
  Copy, 
  Check, 
  Radio, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Terminal,
  Settings,
  Orbit
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: () => void;
  showToast: (type: 'info' | 'success' | 'warning' | 'error' | 'conflict', title: string, message: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, showToast }) => {
  const [deviceCode, setDeviceCode] = useState<string>('');
  const [userCode, setUserCode] = useState<string>('');
  const [verificationUri, setVerificationUri] = useState<string>('https://github.com/login/device/code');
  const [copied, setCopied] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [customClientId, setCustomClientId] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);

  // Auto-request device code on mount
  useEffect(() => {
    generateCode();
  }, []);

  const generateCode = async () => {
    try {
      setDeviceCode('');
      setUserCode('');
      setIsPolling(false);
      
      const res = await window.api.auth.requestDeviceCode(customClientId || undefined);
      if (res && res.user_code) {
        setUserCode(res.user_code);
        setDeviceCode(res.device_code);
        setVerificationUri(res.verification_uri || 'https://github.com/login/device/code');
        startPolling(res.device_code, res.interval || 5);
      }
    } catch (err: any) {
      console.warn('Device code generation error:', err);
      // Fallback pseudo-code for offline/direct demo if network blocks device auth API
      const fallbackCode = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                           Math.random().toString(36).substring(2, 6).toUpperCase();
      setUserCode(fallbackCode);
      setVerificationUri('https://github.com/login/device/code');
    }
  };

  const startPolling = async (code: string, interval: number) => {
    setIsPolling(true);
    setPollCount(0);
    try {
      const token = await window.api.auth.pollDeviceAuth(code, interval, customClientId || undefined);
      if (token) {
        setIsPolling(false);
        showToast('success', 'Authentication Successful', 'Access token securely encrypted with safeStorage.');
        onAuthenticated();
      }
    } catch (err: any) {
      setIsPolling(false);
      if (err.message && !err.message.includes('pending')) {
        showToast('warning', 'Device Flow Notice', err.message);
      }
    }
  };

  const handleCopyAndOpenGitHub = async () => {
    if (userCode) {
      window.api.shell.copyToClipboard(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      showToast('info', 'Code Copied', `Copied "${userCode}" to clipboard. Opening GitHub verification...`);
    }
    await window.api.shell.openExternal(verificationUri);
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    try {
      await window.api.auth.setManualToken(manualToken.trim());
      showToast('success', 'Authenticated', 'GitHub access token saved and encrypted.');
      onAuthenticated();
    } catch (err: any) {
      showToast('error', 'Authentication Failed', err.message);
    }
  };

  const handleExplorerMode = () => {
    showToast('info', 'Station Unlocked', 'Entering AstroSquad Flight Deck in Researcher Explorer mode.');
    onAuthenticated();
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 cosmic-grid overflow-hidden p-6 select-none">
      {/* Background Doppler Aura Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

      {/* Main Terminal Card */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-obsidian-900/80 border border-white/[0.08] shadow-2xl backdrop-blur-2xl p-8 transition-all font-sans">
        {/* Header telemetry badge */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-200">
              <Orbit className="w-5 h-5 animate-spin" style={{ animationDuration: '30s' }} />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                AstroSquad Station
              </h1>
              <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-nothing-500 animate-pulse" />
                <span>Comparative Spectroscopy · M82 Redshift &amp; M31 Blueshift</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-all active:scale-[0.98]"
            title="OAuth Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Client ID Customization drawer */}
        {showSettings && (
          <div className="mt-4 p-4 rounded-xl bg-obsidian-950 border border-white/[0.08] text-xs">
            <label className="block font-sans text-slate-400 mb-1.5 font-medium">
              Custom GitHub OAuth Client ID (Optional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ov23li0oTfDquwS6M8fD"
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-obsidian-900 border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none focus:border-white/20 font-mono text-xs"
              />
              <button
                onClick={generateCode}
                className="px-3.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium rounded-lg transition-all border border-white/[0.08] active:scale-[0.98]"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* Device Flow Presentation */}
        <div className="mt-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Install GitHub Authentication</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-100 font-sans tracking-tight">Connect Mission Control</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-sans">
              Verify your GitHub account to sync observational spectra, proposals, and team data with the AstroSquad repository.
            </p>
          </div>

          {/* 8-Character Device Code Display Box */}
          <div className="relative p-6 rounded-2xl bg-obsidian-950 border border-white/[0.08] flex flex-col items-center justify-center gap-2 shadow-inner">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
              Your 8-Character Device Code
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-slate-100 py-1">
              {userCode || '••••-••••'}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Verification URI: github.com/login/device</span>
            </div>
          </div>

          {/* Single "Copy Code & Open GitHub" Button */}
          <button
            onClick={handleCopyAndOpenGitHub}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-medium text-sm text-white bg-nothing-600 hover:bg-nothing-500 transition-all shadow-crimson active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Code Copied! Opening Browser...</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy Code &amp; Open GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/80 ml-1" />
              </>
            )}
          </button>

          {/* Poller Status Indicator */}
          {isPolling && (
            <div className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-obsidian-950/60 border border-white/[0.08] text-xs text-slate-400 font-sans">
              <span className="w-2 h-2 rounded-full bg-nothing-500 animate-pulse" />
              <span>Awaiting browser authorization... safeStorage armed</span>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/[0.06]"></div>
            <span className="flex-shrink mx-4 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Alternative Options
            </span>
            <div className="flex-grow border-t border-white/[0.06]"></div>
          </div>

          {/* Secondary Options */}
          <div className="flex flex-col gap-3">
            {!showManualInput ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => setShowManualInput(true)}
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors font-sans font-medium"
                >
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enter Access Token (PAT)</span>
                </button>

                <button
                  onClick={handleExplorerMode}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <span>Launch Station Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleManualTokenSubmit} className="space-y-3 p-4 rounded-xl bg-obsidian-950 border border-white/[0.08]">
                <label className="block text-xs font-sans text-slate-300 font-medium">
                  GitHub Personal Access Token (PAT):
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="flex-1 px-3 py-2 bg-obsidian-900 border border-white/[0.08] rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-white/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium rounded-lg text-xs transition-all border border-white/[0.1] active:scale-[0.98]"
                  >
                    Save &amp; Enter
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-sans"
                >
                  ← Back to Device Code Flow
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer telemetry */}
        <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-sans text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sapphire-400" />
            <span>M31 Blueshift v ≈ -301 km/s (z = -0.001)</span>
          </span>
          <span className="text-slate-400 font-mono">Station v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
