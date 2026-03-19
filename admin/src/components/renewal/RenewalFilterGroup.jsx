import React from 'react';
import {
  XIcon,
  UsersIcon,
  TrendingUpIcon,
  BuildingIcon
} from 'lucide-react';

/**
 * Status options for renewal filtering
 */
export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Renewals', description: 'Show all renewal opportunities' },
  { value: 'upcoming', label: 'Upcoming', description: 'Contracts ending within timeframe' },
  { value: 'engaged', label: 'Engaged', description: 'Active engagement in progress' },
  { value: 'high_priority', label: 'High Priority', description: 'High probability & ending soon' }
];

/**
 * BD Manager options (mock data - in real app, fetch from API)
 */
export const BD_MANAGER_OPTIONS = [
  'Sarah Chen',
  'David Wang',
  'Michelle Tan',
  'James Lim',
  'Rachel Wong',
  'Marcus Lee'
];

/**
 * Agency options (mock data - in real app, fetch from API)
 */
export const AGENCY_OPTIONS = [
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

/**
 * Get probability color for slider track
 */
const getProbabilityColor = (value) => {
  if (value >= 80) return 'bg-green-500';
  if (value >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * RenewalFilterGroup - Advanced filter panel content for renewal pipeline
 */
export default function RenewalFilterGroup({
  localFilters,
  onFilterChange,
  onReset,
  onApply,
  onClose,
  loading,
  activeFilterCount
}) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
        <button
          onClick={onClose}
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
            onChange={(e) => onFilterChange('agency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Agencies</option>
            {AGENCY_OPTIONS.map(agency => (
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
            onChange={(e) => onFilterChange('assigned_to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All BD Managers</option>
            <option value="unassigned">Unassigned</option>
            {BD_MANAGER_OPTIONS.map(manager => (
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
            onChange={(e) => onFilterChange('months_ahead', parseInt(e.target.value))}
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
              onChange={(e) => onFilterChange('min_probability', parseInt(e.target.value))}
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
          {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset All
          </button>
          <button
            onClick={onApply}
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
          {STATUS_OPTIONS.map(option => (
            <div key={option.value}>
              <span className="font-medium">{option.label}:</span> {option.description}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
