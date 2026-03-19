import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  FilterIcon,
  RefreshCwIcon,
  SettingsIcon,
} from 'lucide-react';
import alertService from '../shared/services/api/alert.service';
import AlertList from '../components/alerts/AlertList';
import { AlertFilters, AlertBulkActions, AlertGlobalActions, AlertStats } from '../components/alerts/AlertDetail';

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
      // Error fetching alerts
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
      // Error acknowledging alert
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
      // Error bulk marking as read
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
      // Error marking all read
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ priority: '', unread_only: false, trigger_type: '' });
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

  const handlePageChange = (newOffset) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
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
        <AlertStats
          totalCount={alerts.length}
          unreadCount={unreadCount}
          selectedCount={selectedAlerts.length}
        />
      </div>

      {/* Filters */}
      <AlertFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        show={showFilters}
      />

      {/* Bulk Actions */}
      <AlertBulkActions
        selectedCount={selectedAlerts.length}
        onBulkMarkRead={handleBulkMarkRead}
        onCancel={() => setSelectedAlerts([])}
      />

      {/* Global Actions */}
      <AlertGlobalActions
        alerts={alerts}
        selectedAlerts={selectedAlerts}
        unreadCount={unreadCount}
        onSelectAll={handleSelectAll}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Alert List with Pagination */}
      <AlertList
        alerts={alerts}
        loading={loading}
        error={error}
        selectedAlerts={selectedAlerts}
        onSelectAlert={handleSelectAlert}
        onAcknowledge={handleAcknowledge}
        onRetry={fetchAlerts}
        hasFilters={hasFilters}
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
