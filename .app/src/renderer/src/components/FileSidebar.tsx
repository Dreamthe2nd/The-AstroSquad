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
  ArrowLeft, 
  RefreshCw, 
  PanelLeftClose, 
  PanelLeftOpen
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
      return <FileText className="w-3.5 h-3.5 text-rose-400/90 shrink-0" />;
    }
    if (ext === 'pptx') {
      return <Presentation className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />;
    }
    if (ext === 'csv') {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400/90 shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-400/90 shrink-0" />;
    }
    if (ext === 'md' || ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html', 'ps1', 'bat', 'sh', 'py', 'toml', 'yaml', 'yml', 'lock'].includes(ext || '')) {
      return <FileCode className="w-3.5 h-3.5 text-sapphire-400/90 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
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
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="flex items-center gap-2 py-1.5 pr-2 rounded-lg hover:bg-white/[0.04] cursor-pointer text-xs font-sans text-slate-300 hover:text-white transition-colors group"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-slate-300 group-hover:text-white" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              )}
              <span className="truncate font-medium">{node.name}</span>
            </div>

            {isExpanded && node.children && (
              <div className="border-l border-white/[0.06] ml-3.5 my-0.5">
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
          style={{ paddingLeft: `${depth * 12 + 14}px` }}
          className={`flex items-center justify-between gap-2 py-1.5 pr-2.5 rounded-lg cursor-pointer text-xs font-sans transition-all my-0.5 active:scale-[0.99] ${
            isSelected
              ? 'bg-white/[0.08] text-white font-medium border border-white/[0.12] shadow-ambient'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            {getFileIcon(node)}
            <span className="truncate">{node.name}</span>
          </div>

          {node.extension && (
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-500 shrink-0 font-mono">
              {node.extension}
            </span>
          )}
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <div className="w-12 h-full bg-obsidian-950 border-r border-white/[0.06] flex flex-col items-center justify-between py-4 select-none">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onToggleOpen}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors active:scale-[0.98]"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
          <button
            onClick={onReturnToHub}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors active:scale-[0.98]"
            title="Return to Flight Deck"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] font-mono tracking-wider text-slate-600 rotate-90 whitespace-nowrap">
          ASTROSQUAD
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 h-full bg-obsidian-950/90 border-r border-white/[0.06] flex flex-col justify-between select-none overflow-hidden shrink-0 backdrop-blur-xl">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-nothing animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white tracking-tight">
                AstroSquad
              </h2>
              <span className="text-[10px] font-mono text-slate-500">
                main
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors disabled:opacity-40 active:scale-[0.98]"
              title="Pull & Refresh Directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-slate-300' : ''}`} />
            </button>
            <button
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors active:scale-[0.98]"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Back to Flight Deck Link */}
        <button
          onClick={onReturnToHub}
          className="w-[calc(100%-16px)] m-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] text-xs font-sans text-slate-400 hover:text-white transition-all active:scale-[0.98]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>Flight Deck</span>
        </button>
      </div>

      {/* Directory Hierarchy Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        <div className="text-[10px] font-sans font-medium uppercase tracking-wider text-slate-500 px-2 py-1">
          Files & Research
        </div>
        {files && files.length > 0 ? (
          renderTree(files)
        ) : (
          <div className="p-4 text-center text-slate-500 text-xs font-sans">
            {isSyncing ? 'Syncing repository...' : 'No files found in workspace.'}
          </div>
        )}
      </div>

      {/* Footer telemetry */}
      <div className="p-2.5 border-t border-white/[0.06] bg-black/30 text-[10px] font-mono text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>STATION ONLINE</span>
        </span>
      </div>
    </aside>
  );
};
