import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  Table, 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  FileSpreadsheet, 
  Download,
  Filter
} from 'lucide-react';

interface CsvViewerProps {
  filePath: string;
  csvContent: string;
  onOpenInDesktop: () => void;
}

export const CsvViewer: React.FC<CsvViewerProps> = ({ filePath, csvContent, onOpenInDesktop }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Parse CSV
  const { data, headers } = useMemo(() => {
    const parsed = Papa.parse<string[]>(csvContent, {
      skipEmptyLines: true
    });

    if (!parsed.data || parsed.data.length === 0) {
      return { data: [], headers: [] };
    }

    const [headerRow, ...dataRows] = parsed.data;
    return {
      headers: headerRow,
      data: dataRows
    };
  }, [csvContent]);

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

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-950/80 border border-teal-500/30 text-teal-400">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono text-slate-300 font-semibold truncate max-w-xs">
            {filePath.split(/[/\\]/).pop()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950/60 text-teal-400 border border-teal-500/20">
            {data.length} Rows · {headers.length} Cols
          </span>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search observational catalog..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-48 sm:w-64"
            />
          </div>

          <button
            onClick={onOpenInDesktop}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Open in Excel or LibreOffice Calc"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            <span>Open in Desktop</span>
          </button>
        </div>
      </div>

      {/* Table Viewport */}
      <div className="flex-1 w-full overflow-auto bg-slate-950/80 select-text">
        <table className="min-w-full divide-y divide-slate-800 text-left border-collapse">
          <thead className="bg-slate-900 sticky top-0 z-10 select-none shadow-sm">
            <tr>
              <th className="px-3 py-2.5 text-[11px] font-mono text-slate-500 uppercase tracking-wider w-12 border-b border-slate-800">
                #
              </th>
              {headers.map((header, colIndex) => {
                const isSorted = sortColumn === colIndex;
                return (
                  <th
                    key={colIndex}
                    onClick={() => handleSort(colIndex)}
                    className="px-4 py-2.5 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider border-b border-slate-800 hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header}</span>
                      <ArrowUpDown className={`w-3 h-3 ${isSorted ? 'text-cyan-400' : 'text-slate-600'}`} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
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
                <td colSpan={headers.length + 1} className="py-12 text-center text-slate-500 font-mono text-xs">
                  No matching astronomical records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Telemetry Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <span>
            Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
          </span>
          {searchQuery && (
            <span className="text-[11px] text-cyan-400">
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
    </div>
  );
};
