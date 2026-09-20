import React, { useEffect, useMemo, useState } from 'react';
import { 
  Presentation, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import JSZip from 'jszip';

interface PptxViewerProps {
  filePath: string;
  base64Data: string;
  onOpenInDesktop: () => void;
}

interface SlideElement {
  id: string;
  type: 'image' | 'rect' | 'ellipse' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  href?: string;
  text?: string;
  fontSize?: number;
  bold?: boolean;
  color?: string;
}

interface ParsedSlide {
  slideNumber: number;
  title: string;
  hasImage: boolean;
  primaryImage?: string;
  bgColor: string;
  elements: SlideElement[];
}

const SCALE_X = 1920 / 12192000;
const SCALE_Y = 1080 / 6858000;

export const PptxViewer: React.FC<PptxViewerProps> = ({ 
  filePath, 
  base64Data, 
  onOpenInDesktop 
}) => {
  const [slides, setSlides] = useState<ParsedSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fileName = useMemo(() => filePath.split(/[/\\]/).pop() || 'Presentation.pptx', [filePath]);

  const handleOpenDriveDesktop = async () => {
    try {
      await window.api.fs.openInDesktopApp(filePath, 'google_drive');
    } catch (err: any) {
      console.warn('[PptxViewer] Open in Drive Desktop error:', err);
    }
  };


  // Parse PPTX with JSZip into Image-Based Slides & High-Res Vector Snapshots
  useEffect(() => {
    let isCancelled = false;

    const parsePptx = async () => {
      if (!base64Data) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const zip = await JSZip.loadAsync(bytes);

        // 1. Preload embedded media (high-resolution raster & vector assets)
        const mediaMap: Record<string, string> = {};
        for (const [entryPath, file] of Object.entries(zip.files)) {
          if (entryPath.startsWith('ppt/media/')) {
            const ext = entryPath.split('.').pop()?.toLowerCase() || 'png';
            let mime = 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
            else if (ext === 'gif') mime = 'image/gif';
            else if (ext === 'webp') mime = 'image/webp';
            else if (ext === 'svg') mime = 'image/svg+xml';

            const b64 = await file.async('base64');
            const mediaName = entryPath.replace('ppt/media/', '');
            mediaMap[mediaName] = `data:${mime};base64,${b64}`;
          }
        }

        // 2. Discover slide XML files and order numerically
        const slideKeys = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
        slideKeys.sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
          return numA - numB;
        });

        if (slideKeys.length === 0) {
          throw new Error('No slides discovered in presentation package.');
        }

        const parsedSlides: ParsedSlide[] = [];

        for (let i = 0; i < slideKeys.length; i++) {
          const sKey = slideKeys[i];
          const slideNum = i + 1;
          const xml = await zip.files[sKey].async('text');

          // Read relationships for images
          const rKey = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
          const rels: Record<string, string> = {};
          if (zip.files[rKey]) {
            const relXml = await zip.files[rKey].async('text');
            const relMatches = relXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g);
            for (const rm of relMatches) {
              rels[rm[1]] = rm[2].replace('../media/', '').replace('media/', '');
            }
          }

          // Background color
          let bgColor = '#090d16'; // Default sleek dark canvas
          const bgClrMatch = xml.match(/<p:bg>[\s\S]*?<a:solidFill><a:srgbClr val="([A-Fa-f0-9]{6})"\/>/);
          if (bgClrMatch) {
            bgColor = '#' + bgClrMatch[1];
          }

          const elements: SlideElement[] = [];
          let primaryImage: string | undefined;

          // 2a. Pictures (<p:pic>)
          const picMatches = [...xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)];
          for (let pIdx = 0; pIdx < picMatches.length; pIdx++) {
            const pXml = picMatches[pIdx][1];
            const blipMatch = pXml.match(/<a:blip[^>]+r:embed="([^"]+)"/);
            if (blipMatch && rels[blipMatch[1]]) {
              const target = rels[blipMatch[1]];
              const dataUrl = mediaMap[target];
              if (dataUrl) {
                const offMatch = pXml.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
                const extMatch = pXml.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
                const x = offMatch ? Math.round(parseInt(offMatch[1], 10) * SCALE_X) : 0;
                const y = offMatch ? Math.round(parseInt(offMatch[2], 10) * SCALE_Y) : 0;
                const w = extMatch ? Math.round(parseInt(extMatch[1], 10) * SCALE_X) : 1920;
                const h = extMatch ? Math.round(parseInt(extMatch[2], 10) * SCALE_Y) : 1080;

                elements.push({
                  id: `pic-${slideNum}-${pIdx}`,
                  type: 'image',
                  x,
                  y,
                  w,
                  h,
                  href: dataUrl
                });

                if (!primaryImage || (w >= 1800 && h >= 1000)) {
                  primaryImage = dataUrl;
                }
              }
            }
          }

          // 2b. Shapes & Vector Elements (<p:sp>)
          const spMatches = [...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)];
          for (let sIdx = 0; sIdx < spMatches.length; sIdx++) {
            const sp = spMatches[sIdx][1];
            const offMatch = sp.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
            const extMatch = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
            if (!offMatch || !extMatch) continue;

            const x = Math.round(parseInt(offMatch[1], 10) * SCALE_X);
            const y = Math.round(parseInt(offMatch[2], 10) * SCALE_Y);
            const w = Math.round(parseInt(extMatch[1], 10) * SCALE_X);
            const h = Math.round(parseInt(extMatch[2], 10) * SCALE_Y);

            const isEllipse = sp.includes('prst="ellipse"');
            const fillMatch = sp.match(/<a:solidFill><a:srgbClr val="([A-Fa-f0-9]{6})"\/>/);
            const fill = fillMatch ? '#' + fillMatch[1] : undefined;

            if (isEllipse && fill) {
              elements.push({
                id: `sp-ellipse-${slideNum}-${sIdx}`,
                type: 'ellipse',
                x,
                y,
                w,
                h,
                fill
              });
            } else if (fill && !sp.includes('<p:txBody>')) {
              // Decorative rect / line divider
              elements.push({
                id: `sp-rect-${slideNum}-${sIdx}`,
                type: 'rect',
                x,
                y,
                w,
                h,
                fill
              });
            }

            // Text runs inside shape
            const tMatches = [...sp.matchAll(/<a:t>([^<]+)<\/a:t>/g)];
            if (tMatches.length > 0) {
              const text = tMatches.map((m) => m[1]).join(' ').trim();
              if (text && text !== 'undefined') {
                const szMatch = sp.match(/<a:rPr[^>]*sz="(\d+)"/);
                const fontSize = szMatch ? Math.max(Math.round((parseInt(szMatch[1], 10) / 100) * 2), 16) : 26;
                const isBold = sp.includes('b="1"') || sp.includes('b="true"');
                const color = fillMatch ? '#' + fillMatch[1] : (bgColor.toLowerCase() === '#ffffff' ? '#202124' : '#f1f5f9');

                elements.push({
                  id: `sp-text-${slideNum}-${sIdx}`,
                  type: 'text',
                  x,
                  y,
                  w,
                  h,
                  text,
                  fontSize,
                  bold: isBold,
                  color
                });
              }
            }
          }

          // Slide Title
          const titleMatch = xml.match(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph type="(?:title|ctrTitle)"[^>]*\/>(?:(?!<\/p:sp>)[\s\S])*?<a:t>([^<]+)<\/a:t>/i)
            || xml.match(/<a:t>([^<]+)<\/a:t>/);
          const title = titleMatch ? titleMatch[1].trim() : `Slide ${slideNum}`;

          parsedSlides.push({
            slideNumber: slideNum,
            title,
            hasImage: !!primaryImage,
            primaryImage,
            bgColor,
            elements
          });
        }

        if (!isCancelled) {
          setSlides(parsedSlides);
          setCurrentSlideIndex(0);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[PptxViewer] JSZip parsing error:', err);
        if (!isCancelled) {
          setError(err?.message || 'Failed to parse presentation package.');
          setLoading(false);
        }
      }
    };

    parsePptx();

    return () => {
      isCancelled = true;
    };
  }, [base64Data]);

  // Keyboard navigation: Left / Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const currentSlide = slides[currentSlideIndex];


  return (
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between px-4 h-11 bg-obsidian-950/80 border-b border-white/[0.08] backdrop-blur-xl shrink-0">
        {/* Left: Presentation Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <Presentation className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs sm:max-w-sm">
            {fileName}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] font-medium shrink-0">
            Deck
          </span>
        </div>

        {/* Center: Pagination Controls */}
        {slides.length > 0 && (
          <div className="flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.08] shadow-sm">
            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentSlideIndex === 0}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Slide (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-mono text-slate-300 px-2 min-w-[70px] text-center font-medium">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              onClick={() => setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Slide (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <button
            onClick={handleOpenDriveDesktop}
            className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in Google Drive for Desktop — edits sync to your Pro account via Google Slides"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Open in Drive</span>
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Launch in default system presentation editor"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>System Default</span>
          </button>
        </div>
      </div>

      {/* Main Slide Presentation Stage */}
      <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-obsidian-950 dot-matrix-bg relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
            <p className="text-xs text-slate-400 font-sans">Rendering slide graphics...</p>
          </div>
        ) : error || !currentSlide ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-semibold text-slate-200">Presentation Deck Notice</h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {error || 'Presentation could not be displayed.'} Open directly in Google Drive for Desktop to edit in Google Slides.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleOpenDriveDesktop}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium text-xs flex items-center gap-2 border border-white/[0.12] transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in Drive</span>
              </button>
            </div>
          </div>
        ) : (
          /* Centered 16:9 Slide Canvas with Aspect-Ratio Preservation */
          <div className="w-full max-w-5xl aspect-[16/9] max-h-[calc(100vh-12rem)] rounded-xl bg-obsidian-900 border border-white/[0.08] shadow-ambient overflow-hidden flex items-center justify-center">
            <svg
              viewBox="0 0 1920 1080"
              className="w-full h-full object-contain select-none"
              style={{ backgroundColor: currentSlide.bgColor }}
            >
              {/* Background Rect */}
              <rect width="1920" height="1080" fill={currentSlide.bgColor} />

              {/* Slide Elements: Images, Shapes & Crisp Text */}
              {currentSlide.elements.map((el) => {
                if (el.type === 'image' && el.href) {
                  return (
                    <image
                      key={el.id}
                      href={el.href}
                      x={el.x}
                      y={el.y}
                      width={el.w}
                      height={el.h}
                      preserveAspectRatio={el.w >= 1800 && el.h >= 1000 ? 'xMidYMid slice' : 'xMidYMid meet'}
                    />
                  );
                }

                if (el.type === 'ellipse' && el.fill) {
                  const rx = el.w / 2;
                  const ry = el.h / 2;
                  return (
                    <ellipse
                      key={el.id}
                      cx={el.x + rx}
                      cy={el.y + ry}
                      rx={rx}
                      ry={ry}
                      fill={el.fill}
                    />
                  );
                }

                if (el.type === 'rect' && el.fill) {
                  return (
                    <rect
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.w}
                      height={el.h}
                      fill={el.fill}
                    />
                  );
                }

                if (el.type === 'text' && el.text) {
                  return (
                    <foreignObject
                      key={el.id}
                      x={el.x}
                      y={el.y}
                      width={el.w}
                      height={Math.max(el.h, 40)}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          fontSize: `${el.fontSize || 24}px`,
                          fontWeight: el.bold ? 700 : 400,
                          color: el.color || '#202124',
                          lineHeight: 1.25,
                          fontFamily: 'Inter, Aptos, system-ui, -apple-system, sans-serif',
                          wordBreak: 'break-word',
                          overflow: 'hidden'
                        }}
                      >
                        {el.text}
                      </div>
                    </foreignObject>
                  );
                }

                return null;
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Slide Filmstrip / Thumbnail Carousel */}
      {slides.length > 1 && (
        <div className="h-20 bg-obsidian-950/90 border-t border-white/[0.08] px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 select-none backdrop-blur-md">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 shrink-0 px-1 font-semibold">
            Slides:
          </span>
          {slides.map((slide, idx) => {
            const isSelected = idx === currentSlideIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-14 w-24 shrink-0 rounded-lg p-1.5 border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-white/30 bg-white/[0.08] shadow-sm ring-1 ring-white/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-mono font-medium ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                    #{slide.slideNumber}
                  </span>
                  {slide.hasImage && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" title="Contains graphics" />
                  )}
                </div>
                <span className="text-[9px] text-slate-300 truncate w-full font-sans leading-tight">
                  {slide.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
