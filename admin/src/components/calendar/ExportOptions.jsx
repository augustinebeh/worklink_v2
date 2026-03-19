import React from 'react';
import { Calendar, FileText, Mail } from 'lucide-react';

export const EXPORT_FORMATS = [
  { id: 'ics', label: 'Calendar (.ics)', icon: Calendar, description: 'Import into Outlook, Google Calendar, etc.' },
  { id: 'csv', label: 'Spreadsheet (.csv)', icon: FileText, description: 'Excel-compatible format with all details' },
  { id: 'json', label: 'JSON Data', icon: FileText, description: 'Raw data format for developers' },
  { id: 'email', label: 'Email Summary', icon: Mail, description: 'Send schedule summary via email' }
];

export const EXPORT_RANGES = [
  { id: 'today', label: 'Today Only', days: 0 },
  { id: 'week', label: 'This Week', days: 7 },
  { id: 'month', label: 'Next 30 Days', days: 30 },
  { id: 'quarter', label: 'Next 90 Days', days: 90 }
];

/**
 * ExportOptions - Format selection, date range, and options for calendar export
 */
const ExportOptions = ({
  selectedFormat,
  setSelectedFormat,
  selectedRange,
  setSelectedRange,
  includeAvailability,
  setIncludeAvailability,
  includePrivateInfo,
  setIncludePrivateInfo,
  emailAddress,
  setEmailAddress,
  filteredCount
}) => {
  return (
    <>
      {/* Export Format */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Export Format
        </label>
        <div className="space-y-3">
          {EXPORT_FORMATS.map(format => {
            const Icon = format.icon;
            return (
              <label
                key={format.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedFormat === format.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.id}
                  checked={selectedFormat === format.id}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="mt-1"
                />
                <Icon className="w-4 h-4 mt-0.5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {format.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {format.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          {EXPORT_RANGES.map(range => (
            <label
              key={range.id}
              className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedRange === range.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <input
                type="radio"
                name="range"
                value={range.id}
                checked={selectedRange === range.id}
                onChange={(e) => setSelectedRange(e.target.value)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{range.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {filteredCount} interviews in selected range
        </p>
      </div>

      {/* Email Address for Email Export */}
      {selectedFormat === 'email' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="Enter email address"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>
      )}

      {/* Options */}
      <div className="mb-6 space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={includeAvailability}
            onChange={(e) => setIncludeAvailability(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Include availability slots
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={includePrivateInfo}
            onChange={(e) => setIncludePrivateInfo(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Include private information (email addresses)
          </span>
        </label>
      </div>
    </>
  );
};

export default ExportOptions;
