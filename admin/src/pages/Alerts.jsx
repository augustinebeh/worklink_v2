import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  CheckIcon,
  FilterIcon,
  RefreshCwIcon,
  SettingsIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon
} from 'lucide-react';
import alertService from '../shared/services/api/alert.service';
import AlertCard from '../components/alerts/AlertCard';

/**
 * Alerts Page - Full alert management interface
 * Features:
 * - View all alerts with pagination
 * - Filter by priority, type, read/unread status
 * - Bulk actions (mark as read, delete)
 * - Alert preferences link
 */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    priority: '',
    unread_only: false,
    trigger_type: ''
  });
  const [pagination, setPagination] = useState({
    limit: 25,
    offset: 0,
    total: 0
  });
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [filters, pagination.offset]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset
      };

      const response = await alertService.getAlertHistory(params);

      if (response.success) {
        // Handle different response formats from the API
        const alertsData = Array.isArray(response.data) ? response.data : response.data?.alerts || [];
        setAlerts(alertsData);
        setPagination(prev => ({
          ...prev,
          total: response.meta?.total || response.meta?.unread_count || alertsData.length
        }));
      } else {
        setError('Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await alertService.acknowledgeAlert(alertId, {
        user_id: sessionStorage.getItem('user_id') || 'admin',
        action_taken: 'viewed'
      });

      setAlerts(alerts.map(alert =>
        alert.id === alertId
          ? { ...alert, acknowledged_at: new Date().toISOString() }
          : alert
      ));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedAlerts.length === 0) return;

    try {
      for (const alertId of selectedAlerts) {
        await alertService.acknowledgeAlert(alertId, {
          user_id: sessionStorage.getItem('user_id') || 'admin',
          action_taken: 'bulk_read'
        });
      }

      setAlerts(alerts.map(alert =>
        selectedAlerts.includes(alert.id)
          ? { ...alert, acknowledged_at: new Date().toISOString() }
          : alert
      ));

      setSelectedAlerts([]);
    } catch (err) {
      console.error('Error bulk marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertService.markAllRead({
        user_id: sessionStorage.getItem('user_id') || 'admin'
      });

      setAlerts(alerts.map(alert => ({
        ...alert,
        acknowledged_at: new Date().toISOString()
      })));

      setSelectedAlerts([]);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleSelectAlert = (alertId) => {
    setSelectedAlerts(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAlerts.length === alerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(alerts.map(alert => alert.id));
    }
  };

  const unreadCount = alerts.filter(alert => !alert.acknowledged_at).length;
  const hasFilters = Object.values(filters).some(v => v);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BellIcon className="h-6 w-6" />
              Notifications
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage your alerts and notifications
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                border border-slate-200 dark:border-slate-700
                ${showFilters
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }
                transition-colors
              `}
            >
              <FilterIcon className="h-4 w-4" />
              Filters
              {hasFilters && (
                <span className="bg-primary-500 text-white text-xs rounded-full h-2 w-2"></span>
              )}
            </button>

            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <a
              href="/alerts/preferences"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <SettingsIcon className="h-4 w-4" />
              Preferences
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {alerts.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total Alerts</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {unreadCount}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Unread</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {alerts.length - unreadCount}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Read</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {selectedAlerts.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Selected</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type
              </label>
              <select
                value={filters.trigger_type}
                onChange={(e) => handleFilterChange('trigger_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Types</option>
                <option value="tender">Tender</option>
                <option value="renewal">Renewal</option>
                <option value="deadline">Deadline</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={filters.unread_only ? 'unread' : 'all'}
                onChange={(e) => handleFilterChange('unread_only', e.target.value === 'unread')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Alerts</option>
                <option value="unread">Unread Only</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ priority: '', unread_only: false, trigger_type: '' });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAlerts.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-700 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-800 dark:text-primary-200">
              {selectedAlerts.length} alert{selectedAlerts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMarkRead}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <CheckIcon className="h-4 w-4" />
                Mark as Read
              </button>
              <button
                onClick={() => setSelectedAlerts([])}
                className="px-3 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Actions */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
            >
              <input
                type="checkbox"
                checked={selectedAlerts.length === alerts.length && alerts.length > 0}
                onChange={handleSelectAll}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Select All
            </button>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckIcon className="h-4 w-4" />
            Mark All as Read
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 dark:text-red-400 mb-2">{error}</div>
            <button
              onClick={fetchAlerts}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Try again
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No alerts found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {hasFilters ? 'Try adjusting your filters' : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 p-4">
                <input
                  type="checkbox"
                  checked={selectedAlerts.includes(alert.id)}
                  onChange={() => handleSelectAlert(alert.id)}
                  className="mt-2 rounded border-slate-300 dark:border-slate-600"
                />
                <div className="flex-1">
                  <AlertCard
                    alert={alert}
                    onAcknowledge={handleAcknowledge}
                    compact={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {alerts.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} alerts
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={pagination.offset === 0}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}