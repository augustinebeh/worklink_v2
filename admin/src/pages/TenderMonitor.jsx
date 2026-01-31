import { useState, useEffect } from 'react';
import { 
  BellIcon, 
  PlusIcon, 
  RefreshCwIcon, 
  SearchIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  TrendingUpIcon,
  TagIcon,
  RssIcon,
  GlobeIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { clsx } from 'clsx';

function StatCard({ title, value, icon: Icon, color = 'primary', subtitle }) {
  const colors = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

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
      console.error('Failed to fetch data:', error);
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
      console.error('Failed to add alert:', error);
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
      console.error('Failed to toggle alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Delete this keyword alert?')) return;

    try {
      await fetch(`/api/v1/tender-monitor/alerts/${alertId}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleCheckGeBIZ = async () => {
    try {
      const res = await fetch('/api/v1/tender-monitor/check-gebiz', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('GeBIZ check completed. In production, this would fetch live RSS data.');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to check GeBIZ:', error);
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
      console.error('Failed to mark as read:', error);
    }
  };

  const alertColumns = [
    { 
      header: 'Keyword', 
      accessor: 'keyword',
      render: (value) => <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm">{value}</code>
    },
    { header: 'Source', accessor: 'source', render: (value) => <Badge variant="info">{value}</Badge> },
    { header: 'Matches', accessor: 'match_count', render: (value) => value || 0 },
    { 
      header: 'Unread', 
      accessor: 'unread_count', 
      render: (value) => value > 0 ? <Badge variant="error">{value}</Badge> : <span className="text-slate-400">0</span>
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (value, row) => (
        <button onClick={() => handleToggleAlert(row.id, value)} className="flex items-center">
          {value ? (
            <ToggleRightIcon className="h-6 w-6 text-emerald-500" />
          ) : (
            <ToggleLeftIcon className="h-6 w-6 text-slate-400" />
          )}
        </button>
      ),
    },
    {
      header: '',
      accessor: 'id',
      render: (value) => (
        <button onClick={() => handleDeleteAlert(value)} className="p-1 text-red-400 hover:text-red-500">
          <TrashIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tender Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time GeBIZ keyword alerts and tender tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={fetchData}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" icon={RssIcon} onClick={handleCheckGeBIZ}>
            Check GeBIZ
          </Button>
          <Button size="sm" icon={PlusIcon} onClick={() => setShowAddModal(true)}>
            Add Alert
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {['dashboard', 'alerts', 'matches'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab}
            {tab === 'matches' && unreadMatches.length > 0 && (
              <Badge variant="error" className="ml-2">{unreadMatches.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Active Alerts" value={dashboard.stats.activeAlerts} icon={BellIcon} color="primary" />
            <StatCard title="Total Matches" value={dashboard.stats.totalMatches} icon={SearchIcon} color="info" />
            <StatCard title="Unread Matches" value={dashboard.stats.unreadMatches} icon={AlertCircleIcon} color="warning" />
            <StatCard 
              title="Last Checked" 
              value={dashboard.stats.lastChecked ? new Date(dashboard.stats.lastChecked).toLocaleTimeString() : 'Never'} 
              icon={RefreshCwIcon} 
              color="success" 
            />
          </div>

          {/* Alert Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5 text-primary-500" />
                Alert Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.alertPerformance?.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <code className="text-sm font-medium text-slate-700 dark:text-slate-300">"{alert.keyword}"</code>
                      <p className="text-xs text-slate-500 mt-0.5">{alert.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">{alert.total_matches} matches</p>
                      <p className="text-xs text-slate-500">{alert.matches_this_week} this week</p>
                    </div>
                  </div>
                ))}
                {(!dashboard.alertPerformance || dashboard.alertPerformance.length === 0) && (
                  <p className="text-center text-slate-500 py-4">No alerts configured yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Keywords */}
          {dashboard.recommendedKeywords?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5 text-amber-500" />
                  Recommended Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dashboard.recommendedKeywords.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div>
                        <code className="text-sm font-medium text-amber-800 dark:text-amber-300">"{rec.keyword}"</code>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{rec.reason}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          setNewKeyword(rec.keyword);
                          setShowAddModal(true);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <Card padding="none">
          <Table 
            columns={alertColumns} 
            data={alerts} 
            loading={loading}
            emptyMessage="No keyword alerts configured. Add one to start monitoring!"
          />
        </Card>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {unreadMatches.length > 0 && (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={CheckCircleIcon} onClick={handleMarkAllRead}>
                Mark All as Read
              </Button>
            </div>
          )}

          {unreadMatches.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">No unread matches</p>
                <p className="text-sm text-slate-500 mt-1">New tender matches will appear here</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {unreadMatches.map((match) => (
                <Card key={match.id} hover>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="info">{match.keyword}</Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(match.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-900 dark:text-white">{match.title}</h4>
                      {match.agency && (
                        <p className="text-sm text-slate-500 mt-1">{match.agency}</p>
                      )}
                      {match.estimated_value && (
                        <p className="text-sm text-emerald-600 font-medium mt-1">
                          Est. Value: ${(match.estimated_value / 1000).toFixed(0)}K
                        </p>
                      )}
                    </div>
                    {match.external_url && (
                      <a 
                        href={match.external_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ExternalLinkIcon className="h-5 w-5 text-slate-400" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Alert Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Keyword Alert">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Keyword
            </label>
            <Input 
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g., Supply of Manpower Services"
            />
            <p className="text-xs text-slate-500 mt-1">
              Tenders containing this keyword will be matched
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddAlert} disabled={!newKeyword.trim()}>Add Alert</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
