import { clsx } from 'clsx';

export default function Table({ 
  columns, 
  data, 
  loading,
  emptyMessage = 'No data available',
  onRowClick,
  className,
}) {
  if (loading) {
    return (
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {columns.map((col, i) => (
                <th key={i} className="table-cell text-left">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <td key={j} className="table-cell">
                    <div className="skeleton h-4 w-3/4 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container">
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <svg className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('table-container', className)}>
      <table className="w-full">
        <thead>
          <tr className="table-header">
            {columns.map((col, i) => (
              <th 
                key={i} 
                className={clsx('table-cell text-left', col.className)}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {data.map((row, rowIndex) => (
            <tr 
              key={row.id || rowIndex} 
              className={clsx(
                'table-row',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={clsx('table-cell', col.cellClassName)}>
                  {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pagination component
export function TablePagination({ 
  currentPage, 
  totalPages, 
  totalItems,
  pageSize,
  onPageChange,
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-300">{startItem}</span> to{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">{endItem}</span> of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-secondary btn-sm"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-secondary btn-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
