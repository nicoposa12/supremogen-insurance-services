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
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  sortBy,
  sortDir,
  onSort,
  loading = false,
  onRowClick,
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}
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
                  <td key={col.key} className="px-4 py-3.5">
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}
              >
                {col.sortable && onSort ? (
                  <button
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1.5 hover:text-slate-700 transition"
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
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 hover:bg-slate-50/80 transition ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3.5 text-slate-700 ${col.className ?? ''}`}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
