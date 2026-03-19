import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ListIcon,
  RefreshCwIcon
} from 'lucide-react';
import RenewalTimeline from '../components/renewal/RenewalTimeline';
import RenewalPipelineFilters from '../components/renewal/RenewalPipelineFilters';
import RenewalPipelineTable from '../components/renewal/RenewalPipelineTable';
import renewalService from '../shared/services/api/renewal.service';
import { useToast } from '../components/ui/Toast';

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
      setError(err.message);
      toast.error('Error', 'Failed to load renewal data');
    } finally {
      setLoading(false);
    }
  };

  // Apply client-side filters
  const applyFilters = (data, filterParams) => {
    let filtered = data;

    if (filterParams.search) {
      const search = filterParams.search.toLowerCase();
      filtered = filtered.filter(renewal =>
        renewal.agency?.toLowerCase().includes(search) ||
        renewal.contract_description?.toLowerCase().includes(search) ||
        renewal.incumbent_supplier?.toLowerCase().includes(search)
      );
    }

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

    const filtered = applyFilters(renewals, newFilters);
    setFilteredRenewals(filtered);

    setPagination(prev => ({ ...prev, page: 1 }));
    loadData(newFilters);
  };

  // Handle renewal update
  const handleRenewalUpdate = async (id, updateData) => {
    try {
      const response = await renewalService.updateRenewal(id, updateData);
      if (response.success) {
        toast.success('Success', 'Renewal updated successfully');
        loadData();
      }
    } catch (error) {
      toast.error('Error', 'Failed to update renewal');
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadData();
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

      {/* Stats & Filters */}
      <RenewalPipelineFilters
        stats={stats}
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
        <RenewalPipelineTable
          renewals={filteredRenewals}
          loading={loading}
          filters={filters}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
