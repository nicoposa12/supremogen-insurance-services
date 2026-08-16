import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  dense?: boolean;
  rowClassName?: (row: T, index: number) => string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  sortBy,
  sortDir,
  onSort,
  loading = false,
  onRowClick,
  dense = false,
  rowClassName,
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
    );
  };

  // Skeleton rows for loading state
  if (loading) {
    return (
      <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left ${dense ? 'px-1.5 py-1.5 text-[10px]' : 'px-2 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-xs'} font-semibold text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                {columns.map((col) => (
                  <td key={col.key} className={dense ? 'px-1.5 py-1.5' : 'px-2 py-2 sm:px-4 sm:py-3.5'}>
                    <div className="h-4 bg-slate-200 rounded-md animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left ${dense ? 'px-1.5 py-1.5 text-[9.5px]' : 'px-2 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-xs'} font-bold text-slate-500 uppercase tracking-tight ${col.className ?? ''}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700 transition uppercase tracking-tight"
                    >
                      {col.label}
                      {getSortIcon(col.key)}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const customClass = rowClassName ? rowClassName(row, i) : '';
              return (
                <tr
                  key={row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-100 transition ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${customClass || 'hover:bg-slate-50/80'}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`text-slate-700 ${dense ? 'px-1.5 py-1.5 text-[10px]' : 'px-2 py-2 sm:px-4 sm:py-3.5 text-[10px] sm:text-xs'} ${col.className ?? ''}`}>
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}

