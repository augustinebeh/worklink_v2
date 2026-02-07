import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DatabaseIcon,
  RefreshCwIcon,
  SearchIcon,
  DownloadIcon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon,
  ActivityIcon,
  Building2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  Loader2Icon,
  PlayIcon,
  BarChart3Icon
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

// ============================================================================
// SYNC STATUS PANEL — replaces the old modal
// ============================================================================
function SyncStatusPanel({ syncStatus, onStartSync, syncing }) {
  const { is_running, stage, progress, message, stats, elapsed_seconds, error_messages } = syncStatus;

  const formatElapsed = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (stage === 'error') return 'bg-red-500';
    if (stage === 'complete') return 'bg-green-500';
    return 'bg-indigo-500';
  };

  const getStageLabel = () => {
    const labels = {
      idle: 'Idle',
      initializing: 'Initializing',
      starting: 'Starting',
      checking: 'Checking DB',
      fetching: 'Fetching Data',
      processing: 'Processing',
      importing: 'Importing',
      complete: 'Complete',
      error: 'Error'
    };
    return labels[stage] || stage;
  };

  const getStageIcon = () => {
    if (stage === 'complete') return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (stage === 'error') return <AlertCircleIcon className="h-5 w-5 text-red-500" />;
    if (is_running) return <Loader2Icon className="h-5 w-5 text-indigo-500 animate-spin" />;
    return <DatabaseIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Sync Control Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStageIcon()}
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Data.gov.sg Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {is_running ? message || 'Syncing historical tender data...' : stage === 'complete' ? 'Last sync completed successfully' : stage === 'error' ? 'Last sync encountered an error' : 'Sync GeBIZ historical tender data from Data.gov.sg'}
              </p>
            </div>
          </div>
          <button
            onClick={onStartSync}
            disabled={is_running || syncing}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {is_running ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                <span>Start Sync</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar — always visible when running or recently completed */}
        {(is_running || stage === 'complete' || stage === 'error') && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {getStageLabel()}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Stats Cards — visible when running or recently completed */}
      {(is_running || stage === 'complete' || stage === 'error') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <ActivityIcon className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Fetched</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {(stats?.total_fetched || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <DatabaseIcon className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Inserted</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {(stats?.total_inserted || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <ClockIcon className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Elapsed</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {formatElapsed(elapsed_seconds)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircleIcon className="h-4 w-4 text-red-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Errors</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {stats?.errors || 0}
            </p>
          </div>
        </div>
      )}

      {/* Error messages */}
      {error_messages && error_messages.length > 0 && stage === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Recent Errors</p>
          <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
            {error_messages.map((err, i) => (
              <li key={i} className="truncate">• {err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function GeBizIntelligence() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalTenders: 0,
    totalValue: 0,
    totalSuppliers: 0,
    recentActivity: 0
  });

  // Sync status (from polling)
  const [syncStatus, setSyncStatus] = useState({
    is_running: false,
    stage: 'idle',
    progress: 0,
    message: '',
    stats: { total_fetched: 0, total_inserted: 0, total_skipped: 0, errors: 0 },
    elapsed_seconds: 0,
    started_at: null,
    error_messages: []
  });
  const pollRef = useRef(null);
  const wasRunningRef = useRef(false);

  // Competitors state
  const [competitors, setCompetitors] = useState([]);
  const [competitorsPeriod, setCompetitorsPeriod] = useState('6');
  const [competitorsCategory, setCompetitorsCategory] = useState('all');

  // Tenders state
  const [tenders, setTenders] = useState([]);
  const [tendersSearch, setTendersSearch] = useState('');
  const [tendersPage, setTendersPage] = useState(1);
  const [tendersTotalPages, setTendersTotalPages] = useState(1);

  // Categories and agencies
  const [categories, setCategories] = useState([]);
  const [agencies, setAgencies] = useState([]);

  // Tabs
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3Icon },
    { id: 'competitors', name: 'Competitors', icon: UsersIcon },
    { id: 'tenders', name: 'Tenders', icon: ActivityIcon },
    { id: 'agencies', name: 'Agencies', icon: Building2Icon },
    { id: 'renewals', name: 'Renewals', icon: TrendingUpIcon }
  ];

  // ---- Polling for sync status ----
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/gebiz/sync/status');
      const data = await res.json();
      if (data.success && data.data) {
        setSyncStatus(data.data);
        // If sync just finished, refresh dashboard data
        if (wasRunningRef.current && !data.data.is_running) {
          fetchStats();
          fetchFilters();
          toast.success('Sync Complete', `Imported ${data.data.stats?.total_inserted || 0} records`);
        }
        wasRunningRef.current = data.data.is_running;
      }
    } catch {
      // Silently fail — don't disrupt the UI
    }
  }, []);

  // Start polling on mount, speed up when running
  useEffect(() => {
    // Immediate fetch on mount
    fetchSyncStatus();

    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      // Poll every 2s when running, every 30s when idle
      const interval = syncStatus.is_running ? 2000 : 30000;
      pollRef.current = setInterval(fetchSyncStatus, interval);
    };

    startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [syncStatus.is_running, fetchSyncStatus]);

  // ---- API Calls ----
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/gebiz/stats');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          totalTenders: data.stats.tenders || 0,
          totalValue: data.stats.total_value || 0,
          totalSuppliers: data.stats.suppliers || 0,
          recentActivity: data.stats.recent_count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', period: competitorsPeriod });
      if (competitorsCategory !== 'all') params.append('category', competitorsCategory);
      const response = await fetch(`/api/v1/gebiz/competitors?${params}`);
      const data = await response.json();
      if (data.success) setCompetitors(data.competitors || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: tendersPage.toString(), limit: '50' });
      if (tendersSearch) params.append('search', tendersSearch);
      const response = await fetch(`/api/v1/gebiz/tenders/historical?${params}`);
      const data = await response.json();
      if (data.success) {
        setTenders(data.tenders || []);
        setTendersTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [categoriesRes, agenciesRes] = await Promise.all([
        fetch('/api/v1/gebiz/categories'),
        fetch('/api/v1/gebiz/agencies')
      ]);
      const categoriesData = await categoriesRes.json();
      const agenciesData = await agenciesRes.json();
      if (categoriesData.success) setCategories(categoriesData.categories || []);
      if (agenciesData.success) setAgencies(agenciesData.agencies || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  // Trigger sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/v1/gebiz/sync/historical', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Sync Started', 'Fetching data from Data.gov.sg — progress shown below');
        // Immediately fetch status to show running state
        setTimeout(fetchSyncStatus, 500);
      } else {
        toast.error('Sync Failed', data.message || data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      toast.error('Sync Error', 'Failed to start sync. Check server logs.');
    } finally {
      setSyncing(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'competitors') {
      filename = 'competitors.csv';
      csvContent = 'Supplier,Tender Count,Total Value,Avg Value,Latest Win\n';
      competitors.forEach(comp => {
        csvContent += `"${comp.supplier_name}",${comp.tender_count},${comp.total_value},${comp.avg_value},"${comp.latest_win}"\n`;
      });
    } else if (activeTab === 'tenders') {
      filename = 'tenders.csv';
      csvContent = 'Tender No,Description,Supplier,Value,Award Date\n';
      tenders.forEach(tender => {
        csvContent += `"${tender.tender_no}","${tender.description}","${tender.supplier_name}",${tender.awarded_amount},"${tender.award_date}"\n`;
      });
    }

    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Load data on mount + tab changes
  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  useEffect(() => {
    if (activeTab === 'competitors') fetchCompetitors();
    else if (activeTab === 'tenders') fetchTenders();
  }, [activeTab, competitorsPeriod, competitorsCategory, tendersPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'tenders') fetchTenders();
    }, 500);
    return () => clearTimeout(timer);
  }, [tendersSearch]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 112px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">GeBIZ Intelligence</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Historical tender data & competitive intelligence</p>
        </div>
        <div className="flex items-center space-x-3">
          {(activeTab === 'competitors' || activeTab === 'tenders') && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 flex-shrink-0">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Tenders</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTenders.toLocaleString()}</p>
            </div>
            <DatabaseIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${(stats.totalValue / 1000000000).toFixed(1)}B
              </p>
            </div>
            <DollarSignIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Suppliers</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSuppliers.toLocaleString()}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Recent Activity</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.recentActivity}</p>
            </div>
            <ActivityIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mt-4 flex-shrink-0">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 mt-4 overflow-y-auto">

        {/* Dashboard Tab — sync status + overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Sync Status Panel (inline, not modal) */}
            <SyncStatusPanel
              syncStatus={syncStatus}
              onStartSync={handleSync}
              syncing={syncing}
            />

            {/* Quick overview when data exists */}
            {stats.totalTenders > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Quick Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalTenders.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Historical records in database</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalSuppliers.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unique suppliers tracked</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{agencies.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Government agencies</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
                  Use Competitors, Tenders, and Agencies tabs to explore the data
                </p>
              </div>
            )}

            {/* Empty state when no data */}
            {stats.totalTenders === 0 && !syncStatus.is_running && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
                <DatabaseIcon className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Historical Data Yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Click "Start Sync" above to import historical GeBIZ tender data from Data.gov.sg.
                  This will populate the Competitors, Tenders, and Agencies tabs.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Competitors Tab */}
        {activeTab === 'competitors' && (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between flex-shrink-0 mb-4">
              <div className="flex items-center space-x-4">
                <select
                  value={competitorsPeriod}
                  onChange={(e) => setCompetitorsPeriod(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                >
                  <option value="3">Last 3 months</option>
                  <option value="6">Last 6 months</option>
                  <option value="12">Last 12 months</option>
                  <option value="24">Last 24 months</option>
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tender Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Latest Win</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {loading ? (
                      <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                    ) : competitors.length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No competitors found</td></tr>
                    ) : (
                      competitors.map((comp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{comp.supplier_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comp.tender_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${comp.total_value.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${comp.avg_value.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comp.latest_win}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tenders Tab */}
        {activeTab === 'tenders' && (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center space-x-4 flex-shrink-0 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={tendersSearch}
                    onChange={(e) => setTendersSearch(e.target.value)}
                    placeholder="Search tenders..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-y-auto flex-1 min-h-0">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tender No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Award Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {loading ? (
                      <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                    ) : tenders.length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No tenders found</td></tr>
                    ) : (
                      tenders.map((tender, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{tender.tender_no}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{tender.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{tender.supplier_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">${tender.awarded_amount?.toLocaleString() || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{tender.award_date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {tendersTotalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={() => setTendersPage(Math.max(1, tendersPage - 1))}
                    disabled={tendersPage === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Page {tendersPage} of {tendersTotalPages}
                  </span>
                  <button
                    onClick={() => setTendersPage(Math.min(tendersTotalPages, tendersPage + 1))}
                    disabled={tendersPage === tendersTotalPages}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agencies Tab */}
        {activeTab === 'agencies' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Agency Analysis</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Government agency spending patterns and tender frequency. Sync historical data to populate this view.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agencies.slice(0, 12).map((agency, idx) => (
                <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{agency.name || agency}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {agency.count ? `${agency.count} tenders` : 'View tenders'}
                  </p>
                </div>
              ))}
              {agencies.length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 col-span-3 text-center py-8">
                  No agency data available. Go to Dashboard tab and click "Start Sync" to import historical records.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Renewals Tab */}
        {activeTab === 'renewals' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Contract Renewals</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Predicted contract renewals from historical data analysis. Push high-probability renewals to the Tender Pipeline.
                </p>
              </div>
            </div>
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <TrendingUpIcon className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Renewal Intelligence</p>
              <p className="text-sm max-w-md mx-auto">
                Contracts approaching their end dates are analyzed for renewal probability.
                High-probability renewals can be pushed directly to the Tender Pipeline as pre-positioned opportunities.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Sync historical data to detect upcoming renewal opportunities automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
