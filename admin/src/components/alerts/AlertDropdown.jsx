import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  XIcon,
  CheckIcon,
  EyeIcon,
  SettingsIcon
} from 'lucide-react';
import { alertService } from "../../shared/services/api";
import AlertCard from './AlertCard';
import { useNavigate } from 'react-router-dom';

/**
 * AlertDropdown Component
 * Shows 10 most recent unread alerts
 * Priority color coding (critical=red, high=orange, medium=blue, low=gray)
 * Truncated alert text (2 lines max)
 * "Mark as Read" button
 * "View All" link to full page
 */
export default function AlertDropdown({
  isOpen,
  onClose,
  onUnreadCountChange
}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchRecentAlerts();
    }
  }, [isOpen]);

  const fetchRecentAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await alertService.getAlertHistory({
        limit: 10,
        unread_only: false
      });

      if (response.success) {
        // Handle different response formats from the API
        const alertsData = Array.isArray(response.data) ? response.data : response.data?.alerts || [];
        setAlerts(alertsData);
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

      // Update local state
      setAlerts(alerts.map(alert =>
        alert.id === alertId
          ? { ...alert, acknowledged_at: new Date().toISOString() }
          : alert
      ));

      // Update unread count
      if (onUnreadCountChange) {
        const unreadCount = alerts.filter(a => !a.acknowledged_at && a.id !== alertId).length;
        onUnreadCountChange(unreadCount);
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertService.markAllRead({
        user_id: sessionStorage.getItem('user_id') || 'admin'
      });

      // Update local state
      setAlerts(alerts.map(alert => ({
        ...alert,
        acknowledged_at: new Date().toISOString()
      })));

      // Update unread count
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleViewAll = () => {
    navigate('/alerts');
    onClose();
  };

  const unreadAlerts = alerts.filter(alert => !alert.acknowledged_at);
  const unreadCount = unreadAlerts.length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-50 max-h-[600px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {unreadCount} unread
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center space-x-1"
              title="Mark all as read"
            >
              <CheckIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => navigate('/alerts/preferences')}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
            title="Alert preferences"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-sm mb-2">{error}</div>
            <button
              onClick={fetchRecentAlerts}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Try again
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400 text-sm">No notifications</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                compact={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
        <button
          onClick={handleViewAll}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center space-x-1"
        >
          <EyeIcon className="h-4 w-4" />
          <span>View all notifications</span>
        </button>

        <div className="text-xs text-slate-500 dark:text-slate-500">
          {alerts.length} of {alerts.length + (alerts.length === 10 ? '+' : '')} alerts
        </div>
      </div>
    </div>
  );
}