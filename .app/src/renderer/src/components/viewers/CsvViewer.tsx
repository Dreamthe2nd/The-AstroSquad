import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  Table, 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  FileSpreadsheet, 
  Save, 
  Edit3, 
  Sparkles, 
  RotateCcw, 
  Check 
} from 'lucide-react';

interface CsvViewerProps {
  filePath: string;
  csvContent: string;
  onSave?: (newContent: string) => Promise<void>;
  onOpenInDesktop: () => void;
}

export const CsvViewer: React.FC<CsvViewerProps> = ({ 
  filePath, 
  csvContent, 
  onSave, 
  onOpenInDesktop 
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'editor'>('table');
  const [editedContent, setEditedContent] = useState<string>(csvContent);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Table view state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Reset state when switching files or when external content updates
  useEffect(() => {
    setEditedContent(csvContent);
    setSearchQuery('');
    setSortColumn(null);
    setSortAsc(true);
    setCurrentPage(1);
    setSaveSuccess(false);
  }, [filePath, csvContent]);

  // Determine if content was modified
  const isDirty = editedContent !== csvContent;

  // Active content to display in table view: use editedContent if in edit flow
  const currentContentForTable = viewMode === 'editor' ? editedContent : csvContent;

  // Parse CSV (short-circuit for empty content to guarantee instant execution)
  const { data, headers } = useMemo(() => {
    if (!currentContentForTable || !currentContentForTable.trim()) {
      return { data: [], headers: [] };
    }

    const parsed = Papa.parse<string[]>(currentContentForTable, {
      skipEmptyLines: true
    });

    if (!parsed.data || parsed.data.length === 0) {
      return { data: [], headers: [] };
    }

    const [headerRow, ...dataRows] = parsed.data;
    return {
      headers: headerRow || [],
      data: dataRows || []
    };
  }, [currentContentForTable]);

  // Search filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      row.some((cell) => cell && cell.toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  // Sort
  const sortedData = useMemo(() => {
    if (sortColumn === null) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortColumn] || '';
      const valB = b[sortColumn] || '';
      
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [filteredData, sortColumn, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (colIndex: number) => {
    if (sortColumn === colIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(colIndex);
      setSortAsc(true);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editedContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    setEditedContent(csvContent);
  };

  const handleOpenDriveDesktop = async () => {
    if (isDirty && onSave) {
      try {
        await onSave(editedContent);
      } catch (e) {
        console.warn('[CsvViewer] Could not save edits before opening desktop:', e);
      }
    }
    try {
      await window.api.fs.openInDesktopApp(filePath, 'google_drive');
    } catch (e) {
      console.warn('[CsvViewer] Drive desktop open error:', e);
    }
  };

  const editorLines = useMemo(() => {
    return editedContent.split('\n');
  }, [editedContent]);

  return (
    <div className="flex flex-col h-full w-full bg-obsidian-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-obsidian-950/80 border-b border-white/[0.08] backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 shrink-0">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs text-slate-200 font-semibold truncate max-w-xs font-sans">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] shrink-0">
            {data.length} Rows · {headers.length} Cols
          </span>
          {isDirty && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nothing-950/70 text-nothing-300 border border-nothing-500/30 shrink-0 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nothing-500 animate-pulse" />
              Unsaved Changes
            </span>
          )}
        </div>

        {/* View Mode Toggle, Save, Google Drive & Desktop Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Segmented Control */}
          <div className="flex items-center bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.08]">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white/10 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table Grid View"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'editor'
                  ? 'bg-white/10 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Direct In-App CSV Editor (No Excel Required)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
          </div>

          {/* Save Button (when editing or dirty) */}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-[0.98] ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : isDirty
                  ? 'bg-nothing-600 hover:bg-nothing-500 text-white cursor-pointer shadow-crimson'
                  : 'bg-white/[0.03] text-slate-500 border border-white/[0.06] cursor-not-allowed opacity-50'
              }`}
              title="Save CSV changes directly to disk"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save File'}</span>
                </>
              )}
            </button>
          )}

          {/* Revert Button (when dirty) */}
          {isDirty && (
            <button
              onClick={handleRevert}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-nothing-400 border border-white/[0.08] transition-colors"
              title="Discard unsaved edits and reload from disk"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Google Drive — open via Drive for Desktop */}
          <button
            onClick={handleOpenDriveDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in Google Drive for Desktop — edits sync via Google Sheets on your pro account"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Open in Drive</span>
          </button>

          {/* System Desktop Fallback */}
          <button
            onClick={onOpenInDesktop}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-xs text-slate-300 hover:text-white border border-white/[0.08] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
            title="Open in default desktop application"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>System Default</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <>
          {/* Search bar inside Table View */}
          <div className="px-4 py-2 bg-obsidian-900/60 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter catalog records, objects, redshift..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1 bg-obsidian-950 border border-white/[0.08] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10"
              />
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              Click header to sort · Switch to <button onClick={() => setViewMode('editor')} className="text-slate-200 hover:underline font-medium">Editor</button> to modify
            </div>
          </div>

          {/* Table Viewport */}
          <div className="flex-1 w-full overflow-auto bg-obsidian-950/80 select-text">
            <table className="min-w-full divide-y divide-white/[0.06] text-left border-collapse">
              <thead className="bg-obsidian-900 sticky top-0 z-10 select-none shadow-sm">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] font-mono text-slate-500 uppercase tracking-wider w-12 border-b border-white/[0.08]">
                    #
                  </th>
                  {headers.map((header, colIndex) => {
                    const isSorted = sortColumn === colIndex;
                    return (
                      <th
                        key={colIndex}
                        onClick={() => handleSort(colIndex)}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-white/[0.08] hover:bg-white/[0.04] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          <ArrowUpDown className={`w-3 h-3 ${isSorted ? 'text-white' : 'text-slate-600'}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-2 text-slate-500 text-[10px] font-mono">
                        {(currentPage - 1) * pageSize + rowIndex + 1}
                      </td>
                      {headers.map((_, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 text-slate-300 font-mono whitespace-nowrap">
                          {row[colIndex] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length + 1} className="py-12 text-center text-slate-500 text-xs font-sans">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Telemetry Bar */}
          <div className="px-4 py-2 bg-obsidian-900/90 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 select-none shrink-0 font-sans">
            <div className="flex items-center gap-2">
              <span>
                Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
              </span>
              {searchQuery && (
                <span className="text-[11px] font-mono text-teal-400">
                  (Filtered from {data.length} total)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-obsidian-950 border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="flex items-center gap-1 font-mono">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: IN-APP DIRECT CSV EDITOR */}
      {viewMode === 'editor' && (
        <div className="flex-1 w-full flex flex-col overflow-hidden bg-obsidian-950 select-text">
          {/* Editor Header Banner */}
          <div className="px-4 py-2 bg-obsidian-900/60 border-b border-white/[0.08] flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2 text-slate-200">
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-medium">In-App CSV Data Editor</span>
              <span className="text-[10px] text-slate-500 font-normal">
                (Edit values directly — no Microsoft Excel or Office installation required)
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {editorLines.length} lines · {editedContent.length} chars
            </div>
          </div>

          {/* Editor Area with Line Numbers */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers Gutter */}
            <div className="w-12 bg-obsidian-950/80 border-r border-white/[0.06] py-3 text-right pr-2 select-none overflow-hidden shrink-0 font-mono text-xs text-slate-600">
              {editorLines.map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Text Area */}
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-1 h-full bg-obsidian-950 text-slate-200 p-3 font-mono text-xs leading-6 resize-none focus:outline-none border-none selection:bg-white/20 selection:text-white"
              spellCheck={false}
              placeholder="id,object_name,radial_velocity_km_s,redshift_z,notes..."
            />
          </div>

          {/* Editor Footer Status */}
          <div className="px-4 py-2 bg-obsidian-900/90 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 select-none shrink-0 font-sans">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="text-nothing-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-nothing-500 animate-pulse" />
                  Modified — click &quot;Save File&quot; above to commit locally
                </span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1.5">
                  ✓ Synced with local repository file
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-mono text-slate-500">CSV</span>
              <button
                onClick={() => setViewMode('table')}
                className="text-slate-300 hover:text-white underline font-medium"
              >
                Return to Table View →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
