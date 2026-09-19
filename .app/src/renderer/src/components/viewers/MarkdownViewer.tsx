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
    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white border-b border-slate-800 pb-3 flex items-center gap-3">
      <Sparkles className="w-6 h-6 text-cyan-400 shrink-0" />
      <span>{children}</span>
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-cyan-300 mt-8 mb-3 border-b border-slate-800/60 pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold text-slate-200 mt-6 mb-2">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm sm:text-base text-slate-300 leading-relaxed my-3 font-sans">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-sm sm:text-base pl-2">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-sm sm:text-base pl-2">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-slate-300">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-cyan-400 bg-cyan-950/20 px-4 py-2 rounded-r-lg text-slate-300 italic my-4 text-sm font-sans">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
      <table className="min-w-full divide-y divide-slate-800 text-left text-xs font-mono">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-900 text-cyan-400 uppercase tracking-wider font-semibold">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-800/60">
      {children}
    </tbody>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-xs font-bold tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
      {children}
    </td>
  ),
  code: ({ className, children }: any) => {
    const isInline = !className;
    return isInline ? (
      <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs border border-slate-700">
        {children}
      </code>
    ) : (
      <pre className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
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
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-text overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md select-none">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
            <FileText className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono text-slate-300 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/20">
            Markdown + KaTeX Math
          </span>
        </div>

        {/* Edit / View Mode toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setIsEditing(false)}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                !isEditing
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
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
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors shadow-doppler-blue"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
            </button>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Copy Raw Content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenInDesktop}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in Obsidian, VS Code, or default editor"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open in Desktop</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto p-6 md:p-10">
        {isEditing ? (
          <div className="h-full flex flex-col">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[500px] p-4 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-200 font-mono text-sm leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none"
              placeholder="Write Markdown and Doppler LaTeX equations ($z = \Delta\lambda/\lambda_0$)..."
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto prose prose-invert prose-cyan max-w-none space-y-6">
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
