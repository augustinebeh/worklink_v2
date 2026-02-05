import React, { useState, useEffect } from 'react';
import {
  DatabaseIcon,
  RefreshCwIcon,
  SearchIcon,
  DownloadIcon,
  FilterIcon,
  TrendingUpIcon,
  UsersIcon,
  DollarSignIcon,
  ActivityIcon,
  CalendarIcon
} from 'lucide-react';
import { RenewalTimeline } from '../components/bpo';
import { useToast } from '../components/ui/Toast';

export default function GeBizIntelligence() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTenders: 0,
    totalValue: 0,
    totalSuppliers: 0,
    recentActivity: 0
  });
  
  // Competitors state
  const [competitors, setCompetitors] = useState([]);
  const [competitorsPeriod, setCompetitorsPeriod] = useState('6');
  const [competitorsCategory, setCompetitorsCategory] = useState('all');

  // Removed renewal modal state - now using full page
  
  // Tenders state
  const [tenders, setTenders] = useState([]);
  const [tendersSearch, setTendersSearch] = useState('');
  const [tendersPage, setTendersPage] = useState(1);
  const [tendersTotalPages, setTendersTotalPages] = useState(1);
  
  // Categories and agencies
  const [categories, setCategories] = useState([]);
  const [agencies, setAgencies] = useState([]);

  // Tabs including new Renewals tab
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: DatabaseIcon },
    { id: 'competitors', name: 'Competitors', icon: UsersIcon },
    { id: 'tenders', name: 'Tenders', icon: ActivityIcon },
    { id: 'renewals', name: 'Renewals', icon: TrendingUpIcon }
  ];

  // Fetch dashboard stats
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
      toast.error('Loading Failed', 'Unable to fetch GeBIZ statistics');
    }
  };

  // Fetch competitors
  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        period: competitorsPeriod
      });
      if (competitorsCategory !== 'all') {
        params.append('category', competitorsCategory);
      }
      
      const response = await fetch(`/api/v1/gebiz/competitors?${params}`);
      const data = await response.json();
      if (data.success) {
        setCompetitors(data.competitors || []);
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch historical tenders
  const fetchTenders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: tendersPage.toString(),
        limit: '50'
      });
      if (tendersSearch) {
        params.append('search', tendersSearch);
      }
      
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

  // Fetch categories and agencies
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
    setLoading(true);
    try {
      const response = await fetch('/api/v1/gebiz/sync/historical', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert('Sync started! This will take 30-60 minutes. Check back later.');
        fetchStats();
      } else {
        alert('Sync failed: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Error starting sync. Check server logs.');
    } finally {
      setLoading(false);
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

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Load data based on active tab
  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  useEffect(() => {
    if (activeTab === 'competitors') {
      fetchCompetitors();
    } else if (activeTab === 'tenders') {
      fetchTenders();
    }
  }, [activeTab, competitorsPeriod, competitorsCategory, tendersPage]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'tenders') {
        fetchTenders();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tendersSearch]);

  // Removed renewal handlers - now handled by full page

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">GeBIZ Intelligence</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Historical tender data & competitive intelligence</p>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab !== 'renewals' && (
            <>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2"
              >
                <DownloadIcon className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleSync}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Data</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <div className="border-b border-slate-200 dark:border-slate-700">
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
      <div>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Dashboard Overview</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Welcome to GeBIZ Intelligence. Use the tabs above to explore competitors, historical tenders, and renewal opportunities.
            </p>
          </div>
        )}

        {/* Competitors Tab */}
        {activeTab === 'competitors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tender Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Avg Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Latest Win
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : competitors.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        No competitors found
                      </td>
                    </tr>
                  ) : (
                    competitors.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {comp.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {comp.tender_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          ${comp.total_value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          ${comp.avg_value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {comp.latest_win}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tenders Tab */}
        {activeTab === 'tenders' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
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

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tender No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Award Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : tenders.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        No tenders found
                      </td>
                    </tr>
                  ) : (
                    tenders.map((tender, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                          {tender.tender_no}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">
                          {tender.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {tender.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          ${tender.awarded_amount?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {tender.award_date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {tendersTotalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
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

        {/* Renewals Tab - Links to full page */}
        {activeTab === 'renewals' && (
          <div>
            <RenewalTimeline
              monthsAhead={12}
            />
          </div>
        )}
      </div>

      {/* Modal removed - now using full RenewalDetail page */}
    </div>
  );
}
