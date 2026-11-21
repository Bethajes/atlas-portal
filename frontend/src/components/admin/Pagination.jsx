import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Utility function to slice a list into pages
 * @param {Array} list - The full list of items
 * @param {number} page - Current page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Array} - Sliced array for the current page
 */
export function paginatedItems(list, page, pageSize) {
  if (!Array.isArray(list)) return [];
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return list.slice(startIndex, endIndex);
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  variant = 'light',
}) {
  const totalPages = Math.ceil(total / pageSize);
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  const handlePrevious = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  const handlePageSizeChange = (e) => {
    const newPageSize = parseInt(e.target.value, 10);
    onPageSizeChange(newPageSize);
    // Reset to page 1 when changing page size
    onPageChange(1);
  };

  const isDark = variant === 'dark';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t ${
        isDark ? 'bg-slate-900 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      {/* Left: Showing X-Y of Z */}
      <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        Showing <span className="font-medium">{startRecord}</span>–
        <span className="font-medium">{endRecord}</span> of{' '}
        <span className="font-medium">{total}</span>
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={page <= 1}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 ${
            isDark
              ? 'border border-white/10 text-slate-200 bg-slate-800 hover:bg-slate-700 focus:ring-brand-500/40'
              : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-brand-500/40'
          }`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Page <span className="font-medium">{page}</span> of{' '}
          <span className="font-medium">{totalPages}</span>
        </span>

        <button
          onClick={handleNext}
          disabled={page >= totalPages}
          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 ${
            isDark
              ? 'border border-white/10 text-slate-200 bg-slate-800 hover:bg-slate-700 focus:ring-brand-500/40'
              : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-brand-500/40'
          }`}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Right: Page size selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="pageSize" className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Per page:
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={handlePageSizeChange}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 ${
            isDark
              ? 'border border-white/10 text-slate-200 bg-slate-800 hover:bg-slate-700 focus:ring-brand-500/40'
              : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-brand-500/40'
          }`}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}
