import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Code2, 
  Save, 
  Edit3, 
  Eye, 
  Terminal,
  FileText
} from 'lucide-react';

interface CodeViewerProps {
  filePath: string;
  content: string;
  onSave?: (newContent: string) => Promise<void>;
  onOpenInDesktop: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  filePath,
  content,
  onSave,
  onOpenInDesktop
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>(content);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync state when file changes
  useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content, filePath]);

  const ext = useMemo(() => {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }, [filePath]);

  const languageLabel = useMemo(() => {
    switch (ext) {
      case 'json': return 'JSON Data';
      case 'toml': return 'TOML Config';
      case 'yaml':
      case 'yml': return 'YAML Config';
      case 'c': return 'C Source Code';
      case 'h': return 'C Header';
      case 'cpp':
      case 'cc': return 'C++ Source Code';
      case 'hpp': return 'C++ Header';
      case 'py': return 'Python Script';
      case 'sh':
      case 'bash': return 'Shell Script';
      case 'js': return 'JavaScript';
      case 'ts': return 'TypeScript';
      case 'tsx': return 'React TSX';
      case 'jsx': return 'React JSX';
      case 'css': return 'CSS Stylesheet';
      case 'html': return 'HTML Document';
      case 'ini':
      case 'cfg':
      case 'conf': return 'Configuration File';
      case 'txt': return 'Plain Text';
      case 'rs': return 'Rust Source';
      case 'go': return 'Go Source';
      case 'sql': return 'SQL Query';
      default: return ext ? `.${ext.toUpperCase()} File` : 'Source Code';
    }
  }, [ext]);

  const lines = useMemo(() => {
    return (isEditing ? editedContent : content).split('\n');
  }, [isEditing, editedContent, content]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editedContent);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditing ? editedContent : content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-text overflow-hidden font-mono">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md select-none">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-500/30 text-sky-400">
            <FileCode className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-500/20 font-semibold">
            {languageLabel}
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            {lines.length} lines · {content.length} chars
          </span>
        </div>

        {/* View / Edit Mode toggles & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setIsEditing(false)}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                !isEditing
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Viewer</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
                isEditing
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
          </div>

          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-doppler-blue"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save File'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Copy Content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in default code editor (VS Code, Cursor, CLion, etc.)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span>Open in Desktop App</span>
          </button>
        </div>
      </div>

      {/* Code Body Area */}
      <div className="flex-1 w-full overflow-auto bg-slate-950 p-4">
        {isEditing ? (
          <div className="h-full flex flex-col">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[500px] p-4 bg-slate-900/95 border border-slate-700 rounded-xl text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none font-mono"
              spellCheck={false}
              placeholder="Source code or configuration content..."
            />
          </div>
        ) : (
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-inner flex">
            {/* Line numbers gutter */}
            <div className="bg-slate-950/60 py-4 px-3 select-none text-right text-slate-600 border-r border-slate-800/80 shrink-0 font-mono text-xs leading-relaxed">
              {lines.map((_, i) => (
                <div key={i} className="h-5">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code content */}
            <div className="p-4 overflow-x-auto flex-1 font-mono text-xs leading-relaxed text-slate-300">
              {lines.map((line, i) => (
                <div key={i} className="h-5 whitespace-pre">
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
