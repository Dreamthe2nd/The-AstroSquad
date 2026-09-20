import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  ExternalLink, 
  Edit3, 
  Save, 
  Copy, 
  Check, 
  Code2, 
  Eye, 
  Sparkles 
} from 'lucide-react';

// Static plugin arrays to avoid re-instantiating unified processor on every render
const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS: any[] = [[rehypeKatex, { throwOnError: false, strict: false }]];

const MARKDOWN_COMPONENTS: Record<string, React.FC<any>> = {
  h1: ({ children }) => (
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white border-b border-white/[0.08] pb-3 flex items-center gap-2.5 font-sans">
      <span className="w-2 h-2 rounded-full bg-nothing shrink-0" />
      <span>{children}</span>
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100 mt-8 mb-3 border-b border-white/[0.06] pb-2 font-sans">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base sm:text-lg font-semibold text-slate-200 mt-6 mb-2 font-sans">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm sm:text-base text-slate-300 leading-relaxed my-3 font-sans">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-sm sm:text-base pl-2 font-sans">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-sm sm:text-base pl-2 font-sans">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-slate-300">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-nothing bg-white/[0.02] px-4 py-2.5 rounded-r-xl text-slate-300 italic my-4 text-sm font-sans">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-white/[0.08] bg-obsidian-900/60 shadow-sm">
      <table className="min-w-full divide-y divide-white/[0.06] text-left text-xs font-mono">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-obsidian-950/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-white/[0.08]">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/[0.04]">
      {children}
    </tbody>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-xs font-medium text-slate-400">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-xs text-slate-200 whitespace-nowrap">
      {children}
    </td>
  ),
  code: ({ className, children }: any) => {
    const isInline = !className;
    return isInline ? (
      <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-200 font-mono text-xs border border-white/[0.08]">
        {children}
      </code>
    ) : (
      <pre className="p-4 rounded-xl bg-obsidian-950 border border-white/[0.08] text-slate-200 font-mono text-xs overflow-x-auto my-4">
        <code>{children}</code>
      </pre>
    );
  }
};

interface MarkdownViewerProps {
  filePath: string;
  content: string;
  onSave?: (newContent: string) => Promise<void>;
  onOpenInDesktop: () => void;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  filePath,
  content,
  onSave,
  onOpenInDesktop
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>(content);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync state when content or filePath changes
  React.useEffect(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content, filePath]);

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

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 select-text overflow-hidden font-sans">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-obsidian-950/80 border-b border-white/[0.08] backdrop-blur-xl select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-nothing-400 shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] shrink-0 font-medium">
            Markdown + KaTeX Math
          </span>
        </div>

        {/* Edit / View Mode toggles */}
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
              <span>Preview</span>
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
              <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
            </button>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors active:scale-[0.98]"
            title="Copy Raw Content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-xs text-slate-400 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in Obsidian, VS Code, or default editor"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open in Desktop</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto p-6 md:p-10 dot-matrix-bg">
        {isEditing ? (
          <div className="h-full flex flex-col">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[500px] p-4 bg-black/40 border border-white/[0.08] rounded-xl text-slate-100 font-mono text-sm leading-relaxed focus:outline-none focus:border-white/30 resize-none"
              placeholder="Write Markdown and Doppler LaTeX equations ($z = \Delta\lambda/\lambda_0$)..."
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={REHYPE_PLUGINS}
              components={MARKDOWN_COMPONENTS}
            >
              {editedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
