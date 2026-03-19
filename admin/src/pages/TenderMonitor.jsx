import { useState, useEffect } from 'react';
import { TenderMonitorHeader, TenderMonitorTabs, AddAlertModal } from '../components/tenders/TenderMonitorFilters';
import { DashboardTab, AlertsTab, MatchesTab } from '../components/tenders/TenderMonitorTable';

export default function TenderMonitor() {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [unreadMatches, setUnreadMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, alertsRes, matchesRes] = await Promise.all([
        fetch('/api/v1/tender-monitor/dashboard'),
        fetch('/api/v1/tender-monitor/alerts'),
        fetch('/api/v1/tender-monitor/matches/unread'),
      ]);

      const dashData = await dashRes.json();
      const alertsData = await alertsRes.json();
      const matchesData = await matchesRes.json();

      if (dashData.success) setDashboard(dashData.data);
      if (alertsData.success) setAlerts(alertsData.data);
      if (matchesData.success) setUnreadMatches(matchesData.data);
    } catch (error) {
      // Failed to fetch tender monitor data
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = async () => {
    if (!newKeyword.trim()) return;

    try {
      const res = await fetch('/api/v1/tender-monitor/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAlerts([...alerts, data.data]);
        setNewKeyword('');
        setShowAddModal(false);
      }
    } catch (error) {
      // Failed to add alert
    }
  };

  const handleToggleAlert = async (alertId, currentActive) => {
    try {
      await fetch(`/api/v1/tender-monitor/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, active: !currentActive } : a));
    } catch (error) {
      // Failed to toggle alert
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Delete this keyword alert?')) return;

    try {
      await fetch(`/api/v1/tender-monitor/alerts/${alertId}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      // Failed to delete alert
    }
  };

  const handleCheckGeBIZ = async () => {
    try {
      const res = await fetch('/api/v1/tender-monitor/check-gebiz', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      // Failed to check GeBIZ
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/tender-monitor/matches/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setUnreadMatches([]);
      fetchData();
    } catch (error) {
      // Failed to mark as read
    }
  };

  const handleAddKeyword = (keyword) => {
    setNewKeyword(keyword);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <TenderMonitorHeader
        onRefresh={fetchData}
        onCheckGeBIZ={handleCheckGeBIZ}
        onAddAlert={() => setShowAddModal(true)}
      />

      {/* Tabs */}
      <TenderMonitorTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadMatches.length}
      />

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardTab dashboard={dashboard} onAddKeyword={handleAddKeyword} />
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <AlertsTab
          alerts={alerts}
          loading={loading}
          onToggleAlert={handleToggleAlert}
          onDeleteAlert={handleDeleteAlert}
        />
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <MatchesTab
          unreadMatches={unreadMatches}
          onMarkAllRead={handleMarkAllRead}
        />
      )}

      {/* Add Alert Modal */}
      <AddAlertModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        keyword={newKeyword}
        onKeywordChange={setNewKeyword}
        onSubmit={handleAddAlert}
      />
    </div>
  );
}
