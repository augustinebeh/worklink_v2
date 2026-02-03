/**
 * Performance Alerts Management Component
 * Manage and respond to performance alerts and notifications
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Clock, CheckCircle, XCircle,
  Filter, Search, Bell, Users, TrendingDown,
  AlertCircle, Info, ArrowUp, ArrowDown
} from 'lucide-react';

const AlertsManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    severity: '',
    status: 'active',
    consultantId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlerts, setSelectedAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.severity) params.append('severity', filter.severity);
      if (filter.status) params.append('status', filter.status);
      if (filter.consultantId) params.append('consultantId', filter.consultantId);

      const response = await fetch(`/api/v1/consultant-performance/analytics/alerts?${params}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId, notes = '') => {
    try {
      const response = await fetch(
        `/api/v1/consultant-performance/analytics/alerts/${alertId}/acknowledge`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'acknowledged', notes })
        }
      );

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolveAlert = async (alertId, notes = '') => {
    try {
      const response = await fetch(
        `/api/v1/consultant-performance/analytics/alerts/${alertId}/acknowledge`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'resolved', notes })
        }
      );

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleBulkAction = async (action) => {
    const promises = selectedAlerts.map(alertId => {
      if (action === 'acknowledge') {
        return handleAcknowledgeAlert(alertId);
      } else if (action === 'resolve') {
        return handleResolveAlert(alertId);
      }
    });

    await Promise.all(promises);
    setSelectedAlerts([]);
  };

  const getAlertIcon = (alertType, severity) => {
    switch (alertType) {
      case 'performance_drop':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'quality_issue':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'capacity_warning':
        return <Users className="w-5 h-5 text-yellow-500" />;
      case 'achievement':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTimeSinceAlert = (createdAt) => {
    const now = new Date();
    const alertTime = new Date(createdAt);
    const diffMs = now - alertTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m ago`;
    }
    return `${diffMins}m ago`;
  };

  const filteredAlerts = alerts.filter(alert =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (alert.consultant_name && alert.consultant_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Performance Alerts</h2>
              <p className="text-sm text-gray-600">Monitor and respond to performance issues</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {filteredAlerts.length} alerts
            </span>
            {selectedAlerts.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('acknowledge')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Acknowledge ({selectedAlerts.length})
                </button>
                <button
                  onClick={() => handleBulkAction('resolve')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  Resolve ({selectedAlerts.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
            />
          </div>

          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-gray-200">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-6 hover:bg-gray-50 ${
                selectedAlerts.includes(alert.id) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedAlerts.includes(alert.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAlerts([...selectedAlerts, alert.id]);
                    } else {
                      setSelectedAlerts(selectedAlerts.filter(id => id !== alert.id));
                    }
                  }}
                  className="mt-1 rounded"
                />

                {/* Alert Icon */}
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.alert_type, alert.severity)}
                </div>

                {/* Alert Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-2">{alert.description}</p>

                      {/* Alert Details */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {alert.consultant_name && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {alert.consultant_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSinceAlert(alert.created_at)}
                        </span>
                        {alert.trigger_metric && (
                          <span>
                            {alert.trigger_metric}: {Math.round(alert.trigger_value)}
                            {alert.threshold_value && (
                              <span className="text-red-500">
                                {' '}(threshold: {Math.round(alert.threshold_value)})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Resolution Notes */}
                      {alert.resolution_notes && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                          <strong>Resolution notes:</strong> {alert.resolution_notes}
                        </div>
                      )}
                    </div>

                    {/* Priority Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {alert.priority_score || 0}
                      </div>
                      <div className="text-xs text-gray-500">Priority</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {alert.status === 'active' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Resolve
                      </button>
                      <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            {filter.status === 'active' ? (
              <div>
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                <p className="text-gray-600">All performance indicators are within normal ranges.</p>
              </div>
            ) : (
              <div>
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts Found</h3>
                <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alert Statistics Footer */}
      {filteredAlerts.length > 0 && (
        <div className="p-6 border-t bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-600">
                {filteredAlerts.filter(a => a.severity === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">
                {filteredAlerts.filter(a => a.severity === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {filteredAlerts.filter(a => a.severity === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Medium</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {filteredAlerts.filter(a => a.severity === 'low').length}
              </div>
              <div className="text-sm text-gray-600">Low</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsManagement;