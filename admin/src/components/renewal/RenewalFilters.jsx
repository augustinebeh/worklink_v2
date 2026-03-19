import React, { useState, useEffect } from 'react';
import {
  FilterIcon,
  SearchIcon,
  DownloadIcon,
  XIcon,
  ChevronDownIcon,
} from 'lucide-react';
import RenewalFilterGroup, { STATUS_OPTIONS } from './RenewalFilterGroup';

export default function RenewalFilters({
  filters,
  onFiltersChange,
  loading,
  totalCount = 0
}) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Apply filters immediately when local filters change
  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    const defaultFilters = {
      status: 'upcoming',
      months_ahead: 12,
      min_probability: 0,
      agency: '',
      assigned_to: '',
      search: ''
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  // Handle individual filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      // In a real app, call an export API endpoint
      // Mock CSV export
      const csvContent = [
        'Agency,Contract Description,End Date,Value,Probability,Status,Assigned To',
        'Ministry of Health,IT Support Services,2024-06-30,$250000,85%,relationship_building,Sarah Chen',
        'Ministry of Education,Cleaning Services,2024-08-15,$150000,72%,initial_contact,David Wang'
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `renewal-pipeline-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Error exporting data
    }
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.agency) count++;
    if (localFilters.assigned_to) count++;
    if (localFilters.min_probability > 0) count++;
    if (localFilters.status !== 'upcoming') count++;
    if (localFilters.months_ahead !== 12) count++;
    return count;
  };

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex flex-1 items-center space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Search agency, description, or supplier..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Quick Status Filter */}
          <select
            value={localFilters.status}
            onChange={(e) => {
              handleFilterChange('status', e.target.value);
              // Auto-apply for status changes
              setTimeout(() => {
                onFiltersChange({ ...localFilters, status: e.target.value });
              }, 0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              getActiveFilterCount() > 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FilterIcon className="h-4 w-4" />
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {getActiveFilterCount()}
              </span>
            )}
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {totalCount} {totalCount === 1 ? 'renewal' : 'renewals'}
          </span>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {isFilterPanelOpen && (
        <RenewalFilterGroup
          localFilters={localFilters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          onApply={() => {
            applyFilters();
            setIsFilterPanelOpen(false);
          }}
          onClose={() => setIsFilterPanelOpen(false)}
          loading={loading}
          activeFilterCount={getActiveFilterCount()}
        />
      )}

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && !isFilterPanelOpen && (
        <div className="flex flex-wrap gap-2">
          {localFilters.search && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Search: "{localFilters.search}"
              <button
                onClick={() => {
                  handleFilterChange('search', '');
                  applyFilters();
                }}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.agency && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
              Agency: {localFilters.agency}
              <button
                onClick={() => {
                  handleFilterChange('agency', '');
                  applyFilters();
                }}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.assigned_to && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Assigned: {localFilters.assigned_to}
              <button
                onClick={() => {
                  handleFilterChange('assigned_to', '');
                  applyFilters();
                }}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.min_probability > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
              Min Probability: {localFilters.min_probability}%
              <button
                onClick={() => {
                  handleFilterChange('min_probability', 0);
                  applyFilters();
                }}
                className="ml-2 text-orange-600 hover:text-orange-800"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
