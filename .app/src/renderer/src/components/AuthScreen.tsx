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
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl p-8 transition-all">
        {/* Header telemetry badge */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-rose-500 p-0.5 shadow-doppler-glow">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Orbit className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                AstroSquad Research Station
              </h1>
              <p className="text-xs font-mono text-cyan-400/80 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-ping text-cyan-400" />
                <span>Spectroscopy Station · z = Δλ/λ₀ · M82 Redshift / M31 Blueshift</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700/50 transition-colors"
            title="OAuth Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Client ID Customization drawer */}
        {showSettings && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <label className="block font-mono text-slate-400 mb-1">
              Custom GitHub OAuth Client ID (Optional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ov23li0oTfDquwS6M8fD"
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
              <button
                onClick={generateCode}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* Device Flow Presentation */}
        <div className="mt-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Install GitHub Authentication</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Connect Mission Control</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Verify your GitHub account to sync observational spectra, proposals, and team data with the AstroSquad repository.
            </p>
          </div>

          {/* 8-Character Device Code Display Box */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-rose-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-500" />
            <div className="relative p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                Your 8-Character Device Code
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-rose-400 py-1">
                {userCode || '••••-••••'}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Verification URI: github.com/login/device</span>
              </div>
            </div>
          </div>

          {/* Single "Copy Code & Open GitHub" Button */}
          <button
            onClick={handleCopyAndOpenGitHub}
            className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:from-cyan-300 hover:to-teal-200 transition-all shadow-doppler-blue active:scale-[0.99]"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-slate-950" />
                <span>Code Copied! Opening Browser...</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 text-slate-950 group-hover:rotate-6 transition-transform" />
                <span>Copy Code & Open GitHub</span>
                <ExternalLink className="w-4 h-4 text-slate-900 ml-1 opacity-75" />
              </>
            )}
          </button>

          {/* Poller Status Indicator */}
          {isPolling && (
            <div className="flex items-center justify-center gap-2.5 py-2 px-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Awaiting browser authorization... safeStorage armed</span>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Alternative Options
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Secondary Options */}
          <div className="flex flex-col gap-3">
            {!showManualInput ? (
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => setShowManualInput(true)}
                  className="text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors font-mono"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Enter Personal Access Token</span>
                </button>

                <button
                  onClick={handleExplorerMode}
                  className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Launch Station Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleManualTokenSubmit} className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <label className="block text-xs font-mono text-slate-300">
                  GitHub Personal Access Token (PAT):
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    Save & Enter
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  ← Back to Device Code Flow
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer telemetry */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>M31 Blueshift v ≈ -301 km/s (z = -0.001)</span>
          </span>
          <span className="text-slate-400">Station v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
