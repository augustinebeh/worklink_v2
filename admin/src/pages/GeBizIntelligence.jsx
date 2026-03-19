import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DatabaseIcon,
  DownloadIcon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon,
  ActivityIcon,
  Building2Icon,
  BarChart3Icon,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import GeBizDashboard from '../components/gebiz/GeBizDashboard';
import GeBizTenderList from '../components/gebiz/GeBizTenderList';

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
        if (wasRunningRef.current && !data.data.is_running) {
          fetchStats();
          fetchFilters();
          toast.success('Sync Complete', `Imported ${data.data.stats?.total_inserted || 0} records`);
        }
        wasRunningRef.current = data.data.is_running;
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current);
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
      // Error fetching stats
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
      // Error fetching competitors
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
      // Error fetching tenders
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
      // Error fetching filters
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/v1/gebiz/sync/historical', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast.success('Sync Started', 'Fetching data from Data.gov.sg — progress shown below');
        setTimeout(fetchSyncStatus, 500);
      } else {
        toast.error('Sync Failed', data.message || data.error || 'Unknown error');
      }
    } catch (error) {
      toast.error('Sync Error', 'Failed to start sync. Check server logs.');
    } finally {
      setSyncing(false);
    }
  };

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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <GeBizDashboard
            syncStatus={syncStatus}
            onStartSync={handleSync}
            syncing={syncing}
            stats={stats}
            agencies={agencies}
          />
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
          <GeBizTenderList
            tenders={tenders}
            loading={loading}
            tendersSearch={tendersSearch}
            onSearchChange={setTendersSearch}
            tendersPage={tendersPage}
            tendersTotalPages={tendersTotalPages}
            onPageChange={setTendersPage}
          />
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
