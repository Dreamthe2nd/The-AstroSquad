import React, { useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  Image as ImageIcon, 
  ExternalLink,
  Move
} from 'lucide-react';

interface ImageViewerProps {
  filePath: string;
  base64Data: string;
  mimeType?: string;
  onOpenInDesktop: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  filePath,
  base64Data,
  mimeType = 'image/png',
  onOpenInDesktop
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const imgSrc = `astrosquad://repo/${encodeURIComponent(filePath.replace(/\\/g, '/'))}`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 400));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div 
      className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 select-none overflow-hidden font-sans"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-obsidian-950/80 border-b border-white/[0.08] backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <ImageIcon className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs font-sans">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            Astronomical Image
          </span>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.08]">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 25}
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
            disabled={zoom >= 400}
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
            onClick={handleReset}
            className="px-2 py-1 text-[11px] font-sans text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset"
          >
            Reset
          </button>
        </div>

        {/* Desktop Launcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-xs text-slate-300 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open in Desktop</span>
          </button>
        </div>
      </div>

      {/* Viewport Canvas */}
      <div 
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden p-6 relative cursor-grab active:cursor-grabbing dot-matrix-bg bg-obsidian-950"
        onMouseDown={handleMouseDown}
      >
        <div
          className="transition-transform duration-100 ease-out origin-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`
          }}
        >
          <img
            src={imgSrc}
            alt="Astronomical Target"
            className="max-h-[75vh] max-w-[80vw] object-contain rounded-xl border border-white/[0.08] shadow-ambient pointer-events-none"
          />
        </div>

        {zoom > 100 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-900/90 border border-white/[0.08] text-[11px] font-sans text-slate-400 backdrop-blur-md">
            <Move className="w-3.5 h-3.5 text-slate-300" />
            <span>Click & drag to pan image</span>
          </div>
        )}
      </div>
    </div>
  );
};
