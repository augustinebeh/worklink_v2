import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ListIcon,
  FilterIcon,
  RefreshCwIcon,
  PlusIcon,
  BarChart3Icon,
  TrendingUpIcon,
  ClockIcon
} from 'lucide-react';
import RenewalTimeline from '../components/renewal/RenewalTimeline';
import RenewalFilters from '../components/renewal/RenewalFilters';
import renewalService from '../shared/services/api/renewal.service';
import { useToast } from '../components/ui/Toast';
import { formatCurrency, formatDate } from '../shared/utils/formatters';

export default function RenewalPipeline() {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'list'
  const [renewals, setRenewals] = useState([]);
  const [filteredRenewals, setFilteredRenewals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'upcoming',
    months_ahead: 12,
    min_probability: 0,
    agency: '',
    assigned_to: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const toast = useToast();

  // Load renewals and stats
  const loadData = async (filterParams = filters) => {
    try {
      setLoading(true);
      setError(null);

      const [renewalsRes, statsRes] = await Promise.all([
        renewalService.getRenewals({
          ...filterParams,
          limit: viewMode === 'list' ? pagination.limit : 100,
          offset: viewMode === 'list' ? (pagination.page - 1) * pagination.limit : 0
        }),
        renewalService.getDashboardStats()
      ]);

      if (renewalsRes.success) {
        setRenewals(renewalsRes.data);
        setFilteredRenewals(renewalsRes.data);
        setPagination(prev => ({
          ...prev,
          total: renewalsRes.meta?.total || renewalsRes.data.length
        }));
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error loading renewal data:', err);
      setError(err.message);
      toast.error('Error', 'Failed to load renewal data');
    } finally {
      setLoading(false);
    }
  };

  // Apply client-side filters
  const applyFilters = (data, filterParams) => {
    let filtered = data;

    // Search filter
    if (filterParams.search) {
      const search = filterParams.search.toLowerCase();
      filtered = filtered.filter(renewal =>
        renewal.agency?.toLowerCase().includes(search) ||
        renewal.contract_description?.toLowerCase().includes(search) ||
        renewal.incumbent_supplier?.toLowerCase().includes(search)
      );
    }

    // Probability filter
    if (filterParams.min_probability > 0) {
      filtered = filtered.filter(renewal =>
        renewal.renewal_probability >= filterParams.min_probability
      );
    }

    return filtered;
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);

    // Apply filters immediately for client-side filtering
    const filtered = applyFilters(renewals, newFilters);
    setFilteredRenewals(filtered);

    // Reset pagination
    setPagination(prev => ({ ...prev, page: 1 }));

    // Reload data for server-side filters
    loadData(newFilters);
  };

  // Handle renewal update
  const handleRenewalUpdate = async (id, updateData) => {
    try {
      const response = await renewalService.updateRenewal(id, updateData);
      if (response.success) {
        toast.success('Success', 'Renewal updated successfully');
        loadData(); // Reload to get updated data
      }
    } catch (error) {
      console.error('Error updating renewal:', error);
      toast.error('Error', 'Failed to update renewal');
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadData();
  };

  // Get probability color class
  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'text-green-600 bg-green-50';
    if (probability >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get urgency badge
  const getUrgencyBadge = (renewal) => {
    const daysUntilRfp = renewal.days_until_rfp || 0;

    if (daysUntilRfp < 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Overdue</span>;
    }
    if (daysUntilRfp <= 30) {
      return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">Imminent</span>;
    }
    if (daysUntilRfp <= 90) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Approaching</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Future</span>;
  };

  useEffect(() => {
    loadData();
  }, [viewMode]);

  if (loading && renewals.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading renewal pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Renewal Pipeline</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage contract renewals and business development opportunities</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListIcon className="h-4 w-4 inline mr-1" />
              List
            </button>
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Pipeline</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.summary.total_renewals || 0}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <BarChart3Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Next 6 Months</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.summary.next_6_months || 0}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">High Probability</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.summary.high_probability || 0}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pipeline Value</p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                  {formatCurrency(stats.summary.total_value || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <BarChart3Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <RenewalFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        loading={loading}
        totalCount={filteredRenewals.length}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'timeline' ? (
        <RenewalTimeline
          renewals={filteredRenewals}
          onRenewalUpdate={handleRenewalUpdate}
          loading={loading}
        />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Agency & Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRenewals.map((renewal) => (
                  <tr key={renewal.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{renewal.agency}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {renewal.contract_description || 'No description'}
                        </div>
                        {renewal.incumbent_supplier && (
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            Current: {renewal.incumbent_supplier}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {renewal.contract_value ? formatCurrency(renewal.contract_value) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      <div>
                        {formatDate(renewal.contract_end_date)}
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {renewal.months_until_expiry > 0
                            ? `${renewal.months_until_expiry} months`
                            : 'Expired'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProbabilityColor(renewal.renewal_probability)}`}>
                        {renewal.renewal_probability}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className="capitalize text-sm text-slate-900 dark:text-white">
                          {renewal.engagement_status?.replace('_', ' ') || 'Not Started'}
                        </span>
                        {getUrgencyBadge(renewal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {renewal.assigned_bd_manager || (
                        <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for List View */}
          {viewMode === 'list' && Math.ceil(pagination.total / pagination.limit) > 1 && (
            <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(Math.min(pagination.page + 1, Math.ceil(pagination.total / pagination.limit)))}
                  disabled={pagination.page === Math.ceil(pagination.total / pagination.limit)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {/* Page numbers would go here - simplified for now */}
                    <button
                      onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(pagination.page + 1, Math.ceil(pagination.total / pagination.limit)))}
                      disabled={pagination.page === Math.ceil(pagination.total / pagination.limit)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredRenewals.length === 0 && !loading && (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No renewals found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filters.search || filters.min_probability > 0 || filters.agency
                  ? 'Try adjusting your filters'
                  : 'No renewal opportunities in the pipeline yet'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}