import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export default function Pagination({
  currentPage,
  lastPage,
  perPage,
  total,
  from,
  to,
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const delta = 2;

    const start = Math.max(2, currentPage - delta);
    const end = Math.min(lastPage - 1, currentPage + delta);

    pages.push(1);

    if (start > 2) pages.push('...');

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < lastPage - 1) pages.push('...');

    if (lastPage > 1) pages.push(lastPage);

    return pages;
  };

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3">
      {/* Info + Per-page */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>
          Showing <span className="font-medium text-slate-700">{from ?? 0}</span> to{' '}
          <span className="font-medium text-slate-700">{to ?? 0}</span> of{' '}
          <span className="font-medium text-slate-700">{total}</span> results
        </span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[10, 15, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-slate-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition ${
                page === currentPage
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
