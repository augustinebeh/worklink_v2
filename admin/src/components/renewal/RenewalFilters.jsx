import React, { useState, useEffect } from 'react';
import {
  FilterIcon,
  SearchIcon,
  DownloadIcon,
  XIcon,
  ChevronDownIcon,
  UsersIcon,
  TrendingUpIcon,
  BuildingIcon
} from 'lucide-react';

export default function RenewalFilters({
  filters,
  onFiltersChange,
  loading,
  totalCount = 0
}) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [agencies, setAgencies] = useState([]);
  const [bdManagers, setBdManagers] = useState([]);

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Renewals', description: 'Show all renewal opportunities' },
    { value: 'upcoming', label: 'Upcoming', description: 'Contracts ending within timeframe' },
    { value: 'engaged', label: 'Engaged', description: 'Active engagement in progress' },
    { value: 'high_priority', label: 'High Priority', description: 'High probability & ending soon' }
  ];

  // BD Manager options (mock data - in real app, fetch from API)
  const bdManagerOptions = [
    'Sarah Chen',
    'David Wang',
    'Michelle Tan',
    'James Lim',
    'Rachel Wong',
    'Marcus Lee'
  ];

  // Agency options (mock data - in real app, fetch from API)
  const agencyOptions = [
    'Ministry of Health (MOH)',
    'Ministry of Education (MOE)',
    'Ministry of Manpower (MOM)',
    'Ministry of Social and Family Development (MSF)',
    'Ministry of Home Affairs (MHA)',
    'Housing Development Board (HDB)',
    'Land Transport Authority (LTA)',
    'Building and Construction Authority (BCA)',
    'Urban Redevelopment Authority (URA)',
    'National Environment Agency (NEA)'
  ];

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
      console.log('Exporting renewal data with filters:', localFilters);

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
      console.error('Error exporting data:', error);
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

  // Get probability color for slider track
  const getProbabilityColor = (value) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
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
            {statusOptions.map(option => (
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
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <button
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Agency Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingIcon className="h-4 w-4 inline mr-1" />
                Agency
              </label>
              <select
                value={localFilters.agency}
                onChange={(e) => handleFilterChange('agency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Agencies</option>
                {agencyOptions.map(agency => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
            </div>

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UsersIcon className="h-4 w-4 inline mr-1" />
                Assigned To
              </label>
              <select
                value={localFilters.assigned_to}
                onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All BD Managers</option>
                <option value="unassigned">Unassigned</option>
                {bdManagerOptions.map(manager => (
                  <option key={manager} value={manager}>{manager}</option>
                ))}
              </select>
            </div>

            {/* Months Ahead */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Months Ahead ({localFilters.months_ahead})
              </label>
              <input
                type="range"
                min="3"
                max="24"
                step="3"
                value={localFilters.months_ahead}
                onChange={(e) => handleFilterChange('months_ahead', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3 months</span>
                <span>24 months</span>
              </div>
            </div>

            {/* Probability Filter */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUpIcon className="h-4 w-4 inline mr-1" />
                Minimum Probability ({localFilters.min_probability}%)
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localFilters.min_probability}
                  onChange={(e) => handleFilterChange('min_probability', parseInt(e.target.value))}
                  className="w-full appearance-none h-2 rounded-lg bg-gray-200"
                  style={{
                    background: `linear-gradient(to right, ${getProbabilityColor(localFilters.min_probability)} 0%, ${getProbabilityColor(localFilters.min_probability)} ${localFilters.min_probability}%, #e5e7eb ${localFilters.min_probability}%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                    High (80%+)
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                    Medium (60-79%)
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                    Low (&lt;60%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {getActiveFilterCount()} {getActiveFilterCount() === 1 ? 'filter' : 'filters'} applied
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset All
              </button>
              <button
                onClick={() => {
                  applyFilters();
                  setIsFilterPanelOpen(false);
                }}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Applying...' : 'Apply Filters'}
              </button>
            </div>
          </div>

          {/* Status Descriptions */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Filter Descriptions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              {statusOptions.map(option => (
                <div key={option.value}>
                  <span className="font-medium">{option.label}:</span> {option.description}
                </div>
              ))}
            </div>
          </div>
        </div>
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