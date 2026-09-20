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

  const displayedLines = useMemo(() => {
    if (isEditing) return lines;
    return lines.slice(0, 2000);
  }, [isEditing, lines]);

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
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 select-text overflow-hidden font-sans">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-obsidian-950/80 border-b border-white/[0.08] backdrop-blur-xl select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sapphire-400 shrink-0">
            <FileCode className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] font-medium shrink-0">
            {languageLabel}
          </span>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            {lines.length} lines · {content.length} chars
          </span>
        </div>

        {/* View / Edit Mode toggles & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
            <button
              onClick={() => setIsEditing(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                !isEditing
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.08]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Viewer</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                isEditing
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.08]'
                  : 'text-slate-400 hover:text-slate-200'
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
              className="px-3 py-1.5 rounded-lg bg-nothing hover:bg-nothing-600 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-crimson border border-nothing-400/30 active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save File'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors active:scale-[0.98]"
            title="Copy Content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-xs text-slate-400 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in default code editor (VS Code, Cursor, CLion, etc.)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open in Desktop App</span>
          </button>
        </div>
      </div>

      {/* Code Body Area */}
      <div className="flex-1 w-full overflow-auto bg-obsidian-950 p-4">
        {isEditing ? (
          <div className="h-full flex flex-col">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[500px] p-4 bg-black/40 border border-white/[0.08] rounded-xl text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-white/30 resize-none"
              spellCheck={false}
              placeholder="Source code or configuration content..."
            />
          </div>
        ) : (
          <div className="flex flex-col rounded-xl bg-obsidian-900/60 border border-white/[0.08] overflow-hidden shadow-sm">
            <div className="flex overflow-x-auto">
              {/* Line numbers gutter */}
              <div className="bg-obsidian-950/60 py-4 px-3 select-none text-right text-slate-600 border-r border-white/[0.06] shrink-0 font-mono text-xs leading-relaxed">
                {displayedLines.map((_, i) => (
                  <div key={i} className="h-5">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code content */}
              <div className="p-4 overflow-x-auto flex-1 font-mono text-xs leading-relaxed text-slate-200">
                {displayedLines.map((line, i) => (
                  <div key={i} className="h-5 whitespace-pre">
                    {line || ' '}
                  </div>
                ))}
              </div>
            </div>

            {lines.length > 2000 && (
              <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] text-slate-400 text-xs flex items-center justify-between font-sans">
                <span>Showing first 2,000 of {lines.length.toLocaleString()} lines for optimal performance.</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 text-black rounded-lg font-medium text-xs transition-colors"
                >
                  Switch to Editor to view full file
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
