import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ExternalLink, 
  FileText, 
  AlertCircle, 
  Sparkles 
} from 'lucide-react';

interface PdfViewerProps {
  filePath: string;
  base64Data?: string;
  onOpenInDesktop: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ filePath, base64Data, onOpenInDesktop }) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  const handleOpenDriveDesktop = async () => {
    try {
      await window.api.fs.openInDesktopApp(filePath, 'google_drive');
    } catch (err: any) {
      console.warn('[PdfViewer] Open in Drive Desktop error:', err);
    }
  };

  // Fast direct streaming URL using custom protocol
  const pdfSource = `astrosquad://repo/${encodeURIComponent(filePath.replace(/\\/g, '/'))}`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));
  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 select-none font-sans">
      {/* Viewer Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-obsidian-950/80 border-b border-white/[0.08] backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-nothing-400 shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] shrink-0 font-medium">
            {filePath.toLowerCase().includes('proposal') ? 'Official Research Proposal' : 'PDF Document'}
          </span>
          {filePath.toLowerCase().includes('proposal') && (
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono ml-2">
              <span className="px-2 py-0.5 rounded-full bg-nothing/15 text-nothing-400 border border-nothing/30">
                M82 Redshift (+203 km/s)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sapphire/15 text-sapphire-400 border border-sapphire/30">
                M31 Blueshift (-300 km/s)
              </span>
            </div>
          )}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.08]">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-300 min-w-[44px] text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/[0.08] mx-1" />

          <button
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-[11px] text-slate-400 hover:text-white transition-colors"
            title="Reset Zoom & Rotation"
          >
            Reset
          </button>
        </div>

        {/* Drive & Desktop Launcher Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenDriveDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in Google Drive for Desktop — syncs to your Pro account for editing in Google Docs"
          >
            <Sparkles className="w-3.5 h-3.5 text-nothing-400" />
            <span>Open in Drive</span>
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-xs text-slate-400 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in default system PDF reader (Acrobat, Preview, Edge)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>System Default</span>
          </button>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="flex-1 w-full h-full bg-obsidian-950 overflow-hidden flex items-center justify-center p-2 relative dot-matrix-bg">
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-200 origin-center"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            width: `${100 * (100 / zoom)}%`,
            height: `${100 * (100 / zoom)}%`
          }}
        >
          {pdfSource ? (
            <embed
              key={pdfSource}
              src={pdfSource}
              type="application/pdf"
              className="w-full h-full rounded-xl border border-white/[0.08] shadow-ambient bg-obsidian-900"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-nothing-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-200">PDF Document Ready</h3>
                <p className="text-xs text-slate-400 max-w-sm font-sans">
                  Document ready for inspection via Google Drive Desktop or default system reader.
                </p>
              </div>
              <button
                onClick={handleOpenDriveDesktop}
                className="px-4 py-2 rounded-xl bg-nothing-600 hover:bg-nothing-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-crimson active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open in Drive</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
