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
  Eye,
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

  const handleOpenGoogleDrive = () => {
    window.api.shell.openGoogleSuite({
      appType: 'drive',
      windowMode: 'browser_tab',
      targetFilePath: filePath
    });
  };

  const editorLines = useMemo(() => {
    return editedContent.split('\n');
  }, [editedContent]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden font-mono">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-teal-950/80 border border-teal-500/30 text-teal-400 shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <span className="text-xs text-slate-300 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950/60 text-teal-400 border border-teal-500/20 shrink-0">
            {data.length} Rows · {headers.length} Cols
          </span>
          {isDirty && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 shrink-0 font-semibold animate-pulse">
              ● Unsaved Changes
            </span>
          )}
        </div>

        {/* View Mode Toggle, Save, Google Drive & Desktop Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Segmented Control */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table Grid View"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'editor'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : isDirty
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-doppler-blue animate-pulse-glow cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
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
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
              title="Discard unsaved edits and reload from disk"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Google Drive Cloud Hub Button */}
          <button
            onClick={handleOpenGoogleDrive}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-xs text-indigo-300 hover:text-white border border-indigo-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Reveal CSV in Explorer and open The-AstroSquad Google Drive to edit in Google Sheets"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Google Drive</span>
          </button>

          {/* System Desktop Fallback */}
          <button
            onClick={onOpenInDesktop}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in Excel, Calc, or default desktop application"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Open in Desktop</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <>
          {/* Search bar inside Table View */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter observational records, objects, redshift..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Click column header to sort · Switch to <button onClick={() => setViewMode('editor')} className="text-teal-400 hover:underline">Editor</button> to edit data
            </div>
          </div>

          {/* Table Viewport */}
          <div className="flex-1 w-full overflow-auto bg-slate-950/80 select-text">
            <table className="min-w-full divide-y divide-slate-800 text-left border-collapse">
              <thead className="bg-slate-900 sticky top-0 z-10 select-none shadow-sm">
                <tr>
                  <th className="px-3 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider w-12 border-b border-slate-800">
                    #
                  </th>
                  {headers.map((header, colIndex) => {
                    const isSorted = sortColumn === colIndex;
                    return (
                      <th
                        key={colIndex}
                        onClick={() => handleSort(colIndex)}
                        className="px-4 py-2.5 text-xs font-bold text-teal-300 uppercase tracking-wider border-b border-slate-800 hover:bg-slate-800/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          <ArrowUpDown className={`w-3 h-3 ${isSorted ? 'text-teal-400' : 'text-slate-600'}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-3 py-2 text-slate-500 text-[10px]">
                        {(currentPage - 1) * pageSize + rowIndex + 1}
                      </td>
                      {headers.map((_, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 text-slate-300 whitespace-nowrap">
                          {row[colIndex] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length + 1} className="py-12 text-center text-slate-500 text-xs">
                      No matching observational records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Telemetry Bar */}
          <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
            <div className="flex items-center gap-2">
              <span>
                Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
              </span>
              {searchQuery && (
                <span className="text-[11px] text-teal-400">
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
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
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
        <div className="flex-1 w-full flex flex-col overflow-hidden bg-slate-950 select-text">
          {/* Editor Header Banner */}
          <div className="px-4 py-2 bg-teal-950/30 border-b border-teal-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-teal-300">
              <Edit3 className="w-3.5 h-3.5 text-teal-400" />
              <span>In-App CSV Data Editor</span>
              <span className="text-[10px] text-slate-400">
                (Edit values directly — no Microsoft Excel or Office installation required)
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {editorLines.length} lines · {editedContent.length} chars
            </div>
          </div>

          {/* Editor Area with Line Numbers */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers Gutter */}
            <div className="w-12 bg-slate-900/70 border-r border-slate-800/80 py-3 text-right pr-2 select-none overflow-hidden shrink-0 font-mono text-xs text-slate-600">
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
              className="flex-1 h-full bg-slate-950 text-slate-200 p-3 font-mono text-xs leading-6 resize-none focus:outline-none border-none selection:bg-teal-500/30 selection:text-white"
              spellCheck={false}
              placeholder="id,object_name,radial_velocity_km_s,redshift_z,notes..."
            />
          </div>

          {/* Editor Footer Status */}
          <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  ● Modified — click &quot;Save File&quot; above to commit locally
                </span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1">
                  ✓ Synced with local repository file
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>Comma-Separated Values (CSV)</span>
              <button
                onClick={() => setViewMode('table')}
                className="text-teal-400 hover:text-teal-300 underline font-semibold"
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
