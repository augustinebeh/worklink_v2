import React, { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  SearchIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  UsersIcon,
  ClockIcon,
  TrophyIcon,
  TargetIcon,
  BarChart3Icon,
  CalendarIcon,
  RefreshCwIcon,
  DownloadIcon,
  EyeIcon,
  StarIcon
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function EPUIntelligence() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    summary: {
      active_opportunities: 0,
      total_estimated_value: 0,
      high_priority_alerts: 0,
      service_types: 0,
      target_agencies: 0
    },
    recent_opportunities: [],
    service_breakdown: {},
    agency_breakdown: {}
  });

  // Opportunities data
  const [opportunities, setOpportunities] = useState([]);
  const [opportunitiesFilters, setOpportunitiesFilters] = useState({
    priority: '',
    service_type: '',
    agency: '',
    min_score: 0
  });
  const [opportunitiesPagination, setOpportunitiesPagination] = useState({
    page: 1,
    totalPages: 1
  });

  // Competitors data
  const [competitors, setCompetitors] = useState([]);
  const [competitorFilters, setCompetitorFilters] = useState({
    service_type: ''
  });

  // Alerts data
  const [alerts, setAlerts] = useState([]);
  const [alertsPriority, setAlertsPriority] = useState('high');

  // Market report data
  const [marketReport, setMarketReport] = useState(null);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3Icon },
    { id: 'opportunities', name: 'Opportunities', icon: TrendingUpIcon },
    { id: 'competitors', name: 'Competitors', icon: UsersIcon },
    { id: 'alerts', name: 'Alerts', icon: AlertTriangleIcon },
    { id: 'market-report', name: 'Market Report', icon: TargetIcon }
  ];

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/gebiz/epu/dashboard');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.dashboard);
      } else {
        toast.error('Failed to load dashboard data', data.message);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Error loading dashboard', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch opportunities
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: opportunitiesPagination.page.toString(),
        limit: '20',
        ...opportunitiesFilters
      });

      const response = await fetch(`/api/v1/gebiz/epu/opportunities?${params}`);
      const data = await response.json();

      if (data.success) {
        setOpportunities(data.opportunities);
        setOpportunitiesPagination(data.pagination);
      } else {
        toast.error('Failed to load opportunities', data.message);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Error loading opportunities', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch competitors
  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        ...competitorFilters
      });

      const response = await fetch(`/api/v1/gebiz/epu/competitors?${params}`);
      const data = await response.json();

      if (data.success) {
        setCompetitors(data.competitors);
      } else {
        toast.error('Failed to load competitors', data.message);
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
      toast.error('Error loading competitors', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        priority: alertsPriority,
        limit: '20'
      });

      const response = await fetch(`/api/v1/gebiz/epu/alerts?${params}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts);
      } else {
        toast.error('Failed to load alerts', data.message);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Error loading alerts', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch market report
  const fetchMarketReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/gebiz/epu/market-report');
      const data = await response.json();

      if (data.success) {
        setMarketReport(data.report);
      } else {
        toast.error('Failed to load market report', data.message);
      }
    } catch (error) {
      console.error('Error fetching market report:', error);
      toast.error('Error loading market report', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger EPU scan
  const triggerScan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/gebiz/epu/scan', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        toast.success('EPU Scan Started', `Found ${data.results.tenders_found} tenders`);
        // Refresh current tab data
        loadTabData();
      } else {
        toast.error('Scan Failed', data.message);
      }
    } catch (error) {
      console.error('Error triggering scan:', error);
      toast.error('Scan Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  const loadTabData = () => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboard();
        break;
      case 'opportunities':
        fetchOpportunities();
        break;
      case 'competitors':
        fetchCompetitors();
        break;
      case 'alerts':
        fetchAlerts();
        break;
      case 'market-report':
        fetchMarketReport();
        break;
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, []);

  // Load data when tab changes
  useEffect(() => {
    loadTabData();
  }, [activeTab, opportunitiesPagination.page, opportunitiesFilters, competitorFilters, alertsPriority]);

  // Priority color mapping
  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  // Threat level color mapping
  const getThreatColor = (threatLevel) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
      minimal: 'bg-gray-400'
    };
    return colors[threatLevel] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            EPU/SER/19 Intelligence
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Service - Manpower Supply category monitoring and competitive intelligence
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={triggerScan}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Scan EPU Tenders</span>
          </button>
        </div>
      </div>

      {/* Dashboard Summary Cards - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Opportunities</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {dashboardData.summary.active_opportunities}
              </p>
            </div>
            <TrendingUpIcon className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${(dashboardData.summary.total_estimated_value / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSignIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">High Priority</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {dashboardData.summary.high_priority_alerts}
              </p>
            </div>
            <AlertTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Service Types</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {dashboardData.summary.service_types}
              </p>
            </div>
            <TargetIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Target Agencies</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {dashboardData.summary.target_agencies}
              </p>
            </div>
            <UsersIcon className="h-8 w-8 text-purple-600" />
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
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
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
          <div className="space-y-6">
            {/* Recent High Priority Opportunities */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Recent High Priority Opportunities
              </h3>
              <div className="space-y-3">
                {dashboardData.recent_opportunities.slice(0, 5).map((opp, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{opp.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {opp.agency} • ${opp.estimated_value?.toLocaleString()} • Score: {opp.intelligence_score}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(opp.alert_priority)}`}>
                        {opp.alert_priority}
                      </span>
                      <button className="text-indigo-600 hover:text-indigo-700">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Service Type Breakdown
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.service_breakdown).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {data.count} tenders
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          ${(data.estimated_value / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Top Agencies
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.agency_breakdown).slice(0, 5).map(([agency, data]) => (
                    <div key={agency} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {agency}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {data.count} tenders
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          ${(data.estimated_value / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={opportunitiesFilters.priority}
                  onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={opportunitiesFilters.service_type}
                  onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, service_type: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Service Types</option>
                  <option value="data_entry">Data Entry</option>
                  <option value="administrative">Administrative</option>
                  <option value="event_support">Event Support</option>
                  <option value="general">General</option>
                </select>

                <input
                  type="text"
                  placeholder="Agency filter..."
                  value={opportunitiesFilters.agency}
                  onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, agency: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                />

                <input
                  type="number"
                  placeholder="Min Intelligence Score"
                  value={opportunitiesFilters.min_score}
                  onChange={(e) => setOpportunitiesFilters(prev => ({ ...prev, min_score: parseInt(e.target.value) || 0 }))}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Opportunities Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Intelligence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Closing Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : opportunities.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                        No opportunities found
                      </td>
                    </tr>
                  ) : (
                    opportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {opp.title}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {opp.agency} • {opp.tender_no}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(opp.alert_priority)}`}>
                            {opp.alert_priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                          ${opp.estimated_value?.toLocaleString() || 'TBD'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${opp.intelligence_score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {opp.intelligence_score}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                          {opp.closing_date || 'TBD'}
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-indigo-600 hover:text-indigo-700">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {opportunitiesPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={() => setOpportunitiesPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={opportunitiesPagination.page === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Page {opportunitiesPagination.page} of {opportunitiesPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setOpportunitiesPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={opportunitiesPagination.page === opportunitiesPagination.totalPages}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competitors Tab */}
        {activeTab === 'competitors' && (
          <div className="space-y-4">
            {/* Competitor Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <select
                value={competitorFilters.service_type}
                onChange={(e) => setCompetitorFilters(prev => ({ ...prev, service_type: e.target.value }))}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Service Types</option>
                <option value="data_entry">Data Entry</option>
                <option value="administrative">Administrative</option>
                <option value="event_support">Event Support</option>
              </select>
            </div>

            {/* Competitors Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Competitor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Threat Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Threat Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {competitors.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {comp.company_name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {comp.total_epu_contracts} contracts
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getThreatColor(comp.threat_level)}`}></div>
                          <span className="text-sm text-slate-900 dark:text-white capitalize">
                            {comp.threat_level}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        {(comp.win_rate * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        ${comp.total_epu_value?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                            <div
                              className="bg-red-600 h-2 rounded-full"
                              style={{ width: `${comp.overall_threat_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {comp.overall_threat_score}/100
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Alert Priority Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <select
                value={alertsPriority}
                onChange={(e) => setAlertsPriority(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="urgent">Urgent Alerts</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.alert_priority)}`}>
                          {alert.alert_priority}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {alert.tender_no}
                        </span>
                      </div>
                      <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                        {alert.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {alert.agency}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Value:</span>
                          <span className="ml-1 font-medium text-slate-900 dark:text-white">
                            ${alert.estimated_value?.toLocaleString() || 'TBD'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Intelligence:</span>
                          <span className="ml-1 font-medium text-slate-900 dark:text-white">
                            {alert.intelligence_score}/100
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Win Probability:</span>
                          <span className="ml-1 font-medium text-slate-900 dark:text-white">
                            {alert.win_probability ? (alert.win_probability * 100).toFixed(0) + '%' : 'TBD'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Closing:</span>
                          <span className="ml-1 font-medium text-slate-900 dark:text-white">
                            {alert.closing_date || 'TBD'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-indigo-600 hover:text-indigo-700 ml-4">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Report Tab */}
        {activeTab === 'market-report' && (
          <div className="space-y-6">
            {marketReport && (
              <>
                {/* Report Header */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      EPU/SER/19 Market Report
                    </h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Generated: {new Date(marketReport.generated_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{marketReport.active_opportunities}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Active Opportunities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${(marketReport.total_estimated_value / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Total Market Value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{marketReport.high_priority_alerts.length}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">High Priority Alerts</div>
                    </div>
                  </div>
                </div>

                {/* Service Type Analysis */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                    Service Type Distribution
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(marketReport.service_type_breakdown).map(([type, data]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {type.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {data.count} opportunities
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            ${(data.estimated_value / 1000).toFixed(0)}K
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agency Analysis */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                    Top Agencies by Activity
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(marketReport.agency_breakdown).slice(0, 10).map(([agency, data]) => (
                      <div key={agency} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {agency}
                        </span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {data.count} tenders
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            ${(data.estimated_value / 1000).toFixed(0)}K
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}