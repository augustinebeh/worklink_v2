import React from 'react';
import { Download } from 'lucide-react';

/**
 * ExportPreview - Footer actions for the calendar export modal
 * Shows cancel/export buttons with loading state
 */
const ExportPreview = ({
  onClose,
  onExport,
  loading,
  selectedFormat,
  emailAddress,
  formatLabel
}) => {
  const isEmailExportDisabled = selectedFormat === 'email' && !emailAddress;

  return (
    <div className="flex justify-end gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onExport}
        disabled={loading || isEmailExportDisabled}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        <Download className="w-4 h-4" />
        Export {formatLabel}
      </button>
    </div>
  );
};

export default ExportPreview;
