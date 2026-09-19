import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image as ImageIcon, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Orbit, 
  ArrowLeft, 
  RefreshCw, 
  PanelLeftClose, 
  PanelLeftOpen,
  Sparkles
} from 'lucide-react';
import { FileNode } from '../types';

interface FileSidebarProps {
  files: FileNode[];
  selectedFile: string | null;
  onSelectFile: (file: FileNode) => void;
  onReturnToHub: () => void;
  onRefresh: () => Promise<void>;
  isSyncing: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({
  files,
  selectedFile,
  onSelectFile,
  onReturnToHub,
  onRefresh,
  isSyncing,
  isOpen,
  onToggleOpen
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    'research': true,
    'targets': true,
    'data': true,
    'Learning-Material': true
  });

  const toggleDirectory = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDirs((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const getFileIcon = (node: FileNode) => {
    const ext = node.extension?.toLowerCase();
    const name = node.name.toLowerCase();

    if (ext === 'pdf' || name === 'proposal') {
      return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    if (ext === 'pptx') {
      return <Presentation className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (ext === 'csv') {
      return <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (ext === 'md') {
      return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const renderTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedFile === node.relativePath;
      const isDir = node.isDirectory;
      const isExpanded = expandedDirs[node.relativePath] ?? false;

      if (isDir) {
        return (
          <div key={node.relativePath} className="select-none">
            <div
              onClick={(e) => toggleDirectory(node.relativePath, e)}
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              className="flex items-center gap-2 py-1.5 pr-2 rounded-lg hover:bg-slate-800/60 cursor-pointer text-xs font-mono text-slate-300 hover:text-cyan-300 transition-colors group"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-cyan-400/80 group-hover:text-cyan-400" />
              ) : (
                <Folder className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
              )}
              <span className="truncate">{node.name}</span>
            </div>

            {isExpanded && node.children && (
              <div className="border-l border-slate-800/60 ml-4">
                {renderTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.relativePath}
          onClick={() => onSelectFile(node)}
          style={{ paddingLeft: `${depth * 14 + 16}px` }}
          className={`flex items-center justify-between gap-2 py-1.5 pr-2 rounded-lg cursor-pointer text-xs font-mono transition-all my-0.5 ${
            isSelected
              ? 'bg-cyan-950/60 text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            {getFileIcon(node)}
            <span className="truncate">{node.name}</span>
          </div>

          {node.extension && (
            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-500 shrink-0 font-mono">
              {node.extension}
            </span>
          )}
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col items-center justify-between py-4 select-none">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onToggleOpen}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
          <button
            onClick={onReturnToHub}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Return to Flight Deck"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] font-mono text-slate-600 rotate-90 whitespace-nowrap">
          AstroSquad
        </div>
      </div>
    );
  }

  return (
    <aside className="w-72 h-full bg-slate-950/95 border-r border-slate-800/80 flex flex-col justify-between select-none overflow-hidden shrink-0 backdrop-blur-md">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-rose-500 p-0.5">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                <Orbit className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-200 tracking-wide">
                AstroSquad Repo
              </h2>
              <span className="text-[10px] font-mono text-cyan-400/80">
                branch: main
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40"
              title="Pull & Refresh Directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Back to Flight Deck Link */}
        <button
          onClick={onReturnToHub}
          className="w-full flex items-center gap-2 px-4 py-2 border-b border-slate-800/60 text-xs font-mono text-slate-400 hover:text-cyan-300 hover:bg-slate-900/50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
          <span>Return to Flight Deck</span>
        </button>
      </div>

      {/* Directory Hierarchy Tree */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1">
          Files & Research Catalogs
        </div>
        {files && files.length > 0 ? (
          renderTree(files)
        ) : (
          <div className="p-4 text-center text-slate-500 text-xs font-mono">
            {isSyncing ? 'Syncing repository...' : 'No files found in workspace.'}
          </div>
        )}
      </div>

      {/* Footer telemetry */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] font-mono text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Doppler Guardrails Active</span>
        </span>
      </div>
    </aside>
  );
};
