import React, { useEffect, useMemo, useState } from 'react';
import { 
  Presentation, 
  ExternalLink, 
  Sparkles, 
  AlertCircle,
  FolderCloud,
  RefreshCw
} from 'lucide-react';
import { ReactPptxViewer, setWasmSource, PptxViewerError } from '@extend-ai/react-pptx';
import '@extend-ai/react-pptx/styles.css';
import wasmUrl from '@extend-ai/react-pptx/pptx_wasm_bg.wasm?url';

// Configure WebAssembly binary asset for client-side rendering
try {
  setWasmSource(wasmUrl);
} catch (e) {
  console.warn('Wasm source initialization:', e);
}

interface PptxViewerProps {
  filePath: string;
  base64Data: string;
  onOpenInDesktop: () => void;
}

export const PptxViewer: React.FC<PptxViewerProps> = ({ 
  filePath, 
  base64Data, 
  onOpenInDesktop 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileName = useMemo(() => filePath.split(/[/\\]/).pop() || 'Presentation.pptx', [filePath]);

  useEffect(() => {
    const checkStatus = () => {
      window.api.drive.getStatus().then((status) => {
        setIsDriveConnected(status.connected);
      }).catch(() => {});
    };
    checkStatus();
    window.addEventListener('focus', checkStatus);
    return () => window.removeEventListener('focus', checkStatus);
  }, []);

  // Convert base64 string to Uint8Array binary buffer
  const binaryData = useMemo(() => {
    if (!base64Data) return null;
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (err: any) {
      console.error('Failed to decode PPTX binary payload:', err);
      setError('Could not decode presentation payload.');
      return null;
    }
  }, [base64Data]);

  const handleOpenGoogleDrive = async () => {
    if (isDriveConnected) {
      setIsUploading(true);
      try {
        const res = await window.api.drive.uploadAndOpen(filePath);
        if (!res.success) {
          console.warn('[PptxViewer] Drive upload failed:', res.message);
          window.api.shell.openGoogleSuite({
            appType: 'drive',
            windowMode: 'browser_tab',
            targetFilePath: filePath
          });
        }
      } catch (err: any) {
        console.warn('[PptxViewer] Drive upload error:', err?.message);
        window.api.shell.openGoogleSuite({
          appType: 'drive',
          windowMode: 'browser_tab',
          targetFilePath: filePath
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      window.api.shell.openGoogleSuite({
        appType: 'drive',
        windowMode: 'browser_tab',
        targetFilePath: filePath
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none font-mono">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-400 shrink-0">
            <Presentation className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-sm">
            {fileName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/20 font-semibold shrink-0">
            PowerPoint Presentation
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenGoogleDrive}
            disabled={isUploading}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-xs text-indigo-300 hover:text-white border border-indigo-500/40 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title={isDriveConnected ? "Upload to Google Drive & launch directly in Google Slides" : "Reveal presentation in Explorer and open The-AstroSquad Google Drive to edit in Google Slides online"}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isUploading ? 'Uploading to Slides...' : (isDriveConnected ? '⚡ Open in Google Slides' : 'Edit in Google Drive')}</span>
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            title="Launch presentation in PowerPoint, Keynote, or system presentation editor"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open in Desktop App</span>
          </button>
        </div>
      </div>

      {/* Presentation Canvas Viewport */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950">
        {error ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-bold text-slate-200">Presentation Rendering Anomaly</h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {error} You can open this presentation directly in your native desktop presentation software (PowerPoint, Keynote, LibreOffice) or via Google Workspace.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onOpenInDesktop}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-doppler-blue"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Desktop App</span>
              </button>
              <button
                onClick={handleOpenGoogleDrive}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                <span>View in Google Drive</span>
              </button>
            </div>
          </div>
        ) : !binaryData ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono">Loading presentation slides and graphics...</p>
          </div>
        ) : (
          <div className="w-full h-full overflow-hidden bg-slate-950 [&_.extend-ui-pptx-viewer]:!bg-slate-950 [&_.extend-ui-pptx-viewer]:!text-slate-100">
            <ReactPptxViewer
              source={binaryData}
              mode="slide"
              showThumbnails={true}
              showToolbar={true}
              onError={(err: PptxViewerError) => {
                console.warn('ReactPptxViewer encountered an error:', err);
                setError(err.message || 'Failed to render slides.');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
