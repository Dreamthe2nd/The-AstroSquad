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
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none font-mono">
      {/* Viewer Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-500/30 text-rose-400">
            <FileText className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-300 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/20">
            {filePath.toLowerCase().includes('proposal') ? 'Official Research Proposal' : 'PDF Document'}
          </span>
          {filePath.toLowerCase().includes('proposal') && (
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono ml-2">
              <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30">
                M82 Redshift (+203 km/s)
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                M31 Blueshift (-300 km/s)
              </span>
            </div>
          )}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-cyan-400 min-w-[44px] text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Zoom & Rotation"
          >
            Reset
          </button>
        </div>

        {/* Drive & Desktop Launcher Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenDriveDesktop}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in Google Drive for Desktop — syncs to your Pro account for editing in Google Docs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Open in Drive</span>
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in default system PDF reader (Acrobat, Preview, Edge)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>System Default</span>
          </button>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center p-2 relative">
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
              className="w-full h-full rounded-lg border border-slate-800 shadow-2xl bg-slate-900"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-400" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-200">PDF Reader Preview</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Document ready for inspection via Google Drive Desktop or system reader.
                </p>
              </div>
              <button
                onClick={handleOpenDriveDesktop}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-doppler-red"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ Open in Drive</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
