import React from 'react';
import { SearchIcon } from 'lucide-react';

export default function GeBizTenderList({
  tenders,
  loading,
  tendersSearch,
  onSearchChange,
  tendersPage,
  tendersTotalPages,
  onPageChange,
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center space-x-4 flex-shrink-0 mb-4">
        <div className="flex-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={tendersSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tenders..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-y-auto flex-1 min-h-0">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tender No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Award Date</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
              ) : tenders.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No tenders found</td></tr>
              ) : (
                tenders.map((tender, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{tender.tender_no}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{tender.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{tender.supplier_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${tender.awarded_amount?.toLocaleString() || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{tender.award_date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tendersTotalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => onPageChange(Math.max(1, tendersPage - 1))}
              disabled={tendersPage === 1}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Page {tendersPage} of {tendersTotalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(tendersTotalPages, tendersPage + 1))}
              disabled={tendersPage === tendersTotalPages}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
