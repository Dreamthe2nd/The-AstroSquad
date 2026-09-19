import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Layers, 
  Sparkles, 
  FileText,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface SlideData {
  slideNumber: number;
  title: string;
  paragraphs: string[];
  notes?: string;
  imageUrls: string[];
}

interface PptxViewerProps {
  filePath: string;
  base64Data: string;
  onOpenInDesktop: () => void;
}

export const PptxViewer: React.FC<PptxViewerProps> = ({ filePath, base64Data, onOpenInDesktop }) => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const parsePptx = async () => {
      try {
        setLoading(true);
        setError(null);

        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(base64Data, { base64: true });
        
        // Find all slide files
        const slideFiles: { num: number; file: JSZip.JSZipObject }[] = [];
        loadedZip.forEach((relativePath, file) => {
          const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
          if (match) {
            slideFiles.push({ num: parseInt(match[1], 10), file });
          }
        });

        // Sort numerically
        slideFiles.sort((a, b) => a.num - b.num);

        const parsedSlides: SlideData[] = [];

        // Parse slide outline text (titles & paragraphs) from slide XMLs without loading heavy media
        for (const { num, file } of slideFiles) {
          const xmlText = await file.async('text');
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

          // Extract text runs <a:t> inside paragraphs <a:p>
          const pElements = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
          const paragraphs: string[] = [];
          let slideTitle = '';

          for (const p of pElements) {
            const tElements = Array.from(p.getElementsByTagNameNS('*', 't'));
            const text = tElements.map((t) => t.textContent?.trim() || '').join(' ').trim();
            if (text) {
              // Usually the first significant heading is title
              if (!slideTitle && text.length < 120) {
                slideTitle = text;
              } else {
                paragraphs.push(text);
              }
            }
          }

          if (!slideTitle) {
            slideTitle = paragraphs.length > 0 ? paragraphs.shift()! : `Slide ${num}`;
          }

          parsedSlides.push({
            slideNumber: num,
            title: slideTitle,
            paragraphs,
            imageUrls: []
          });
        }

        if (isMounted) {
          if (parsedSlides.length === 0) {
            // Fallback for minimalist or encrypted decks
            setSlides([{
              slideNumber: 1,
              title: filePath.split(/[/\\]/).pop()?.replace('.pptx', '') || 'Presentation',
              paragraphs: ['PowerPoint Presentation loaded in station deck.'],
              imageUrls: []
            }]);
          } else {
            setSlides(parsedSlides);
          }
          setCurrentSlideIndex(0);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to parse PPTX file');
          setLoading(false);
        }
      }
    };

    parsePptx();

    return () => {
      isMounted = false;
    };
  }, [base64Data, filePath]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const currentSlide = slides[currentSlideIndex];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-slate-400 gap-3">
        <Presentation className="w-8 h-8 text-amber-400 animate-bounce" />
        <span className="text-xs font-mono">Unpacking Slide Deck Assets...</span>
      </div>
    );
  }

  if (error || !currentSlide) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-950">
        <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
        <h3 className="text-sm font-bold text-slate-200">Presentation Viewer</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          This presentation can be launched directly in your local desktop suite (PowerPoint, LibreOffice, Keynote).
        </p>
        <button
          onClick={onOpenInDesktop}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open in Desktop App</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-400">
            <Presentation className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono text-slate-300 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/20">
            Slide Deck
          </span>
        </div>

        {/* Slide Counter & Prev/Next */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentSlideIndex === 0}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-cyan-400 min-w-[90px] text-center">
            Slide {currentSlideIndex + 1} / {slides.length}
          </span>

          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Next Slide (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInDesktop}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in PowerPoint or LibreOffice"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open in Desktop App</span>
          </button>
        </div>
      </div>

      {/* Main Slide Presentation Stage */}
      <div className="flex-1 w-full flex items-center justify-center p-6 overflow-auto bg-slate-950/90 relative">
        <div className="w-full max-w-4xl aspect-[16/9] rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/60 shadow-2xl p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle slide corner accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 rounded-tr-full pointer-events-none" />

          {/* Slide Header */}
          <div className="space-y-2 border-b border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                AstroSquad Presentation Deck
              </span>
              <span className="text-xs font-mono text-slate-500">
                #{currentSlide.slideNumber}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {currentSlide.title}
            </h2>
          </div>

          {/* Slide Body: Bullets & Diagrams */}
          <div className="flex-1 my-6 overflow-y-auto pr-2 space-y-4">
            {currentSlide.imageUrls.length > 0 && (
              <div className="flex justify-center mb-4">
                <img
                  src={currentSlide.imageUrls[0]}
                  alt="Slide Graphic"
                  className="max-h-48 rounded-lg border border-slate-800 object-contain shadow-md"
                />
              </div>
            )}

            {currentSlide.paragraphs.length > 0 ? (
              <div className="space-y-3">
                {currentSlide.paragraphs.map((p, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-2" />
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
                      {p}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono italic">
                (Visual title slide)
              </div>
            )}
          </div>

          {/* Slide Footer */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="text-cyan-400/80">AstroSquad Research Station</span>
            <span>Doppler Spectroscopy · M82 Starburst &amp; M31 Comparative Analysis</span>
          </div>
        </div>
      </div>

      {/* Slide Filmstrip / Carousel */}
      <div className="h-20 bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0 px-1">
          Filmstrip:
        </span>
        {slides.map((slide, idx) => {
          const isSelected = idx === currentSlideIndex;
          return (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`h-14 w-24 shrink-0 rounded-lg p-1.5 border text-left flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-slate-950 shadow-doppler-blue'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`}>
                #{slide.slideNumber}
              </span>
              <span className="text-[9px] text-slate-300 truncate w-full font-sans">
                {slide.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
