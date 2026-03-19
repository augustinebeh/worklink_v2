import React, { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  UsersIcon,
  TargetIcon,
  BarChart3Icon,
  RefreshCwIcon
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import EPUDashboardTab from '../components/epu/EPUDashboardTab';
import EPUOpportunitiesTab from '../components/epu/EPUOpportunitiesTab';
import EPUCompetitorsTab from '../components/epu/EPUCompetitorsTab';
import EPUAlertsTab from '../components/epu/EPUAlertsTab';
import EPUMarketReportTab from '../components/epu/EPUMarketReportTab';

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
        loadTabData();
      } else {
        toast.error('Scan Failed', data.message);
      }
    } catch (error) {
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
        {activeTab === 'dashboard' && (
          <EPUDashboardTab
            dashboardData={dashboardData}
            getPriorityColor={getPriorityColor}
          />
        )}

        {activeTab === 'opportunities' && (
          <EPUOpportunitiesTab
            opportunities={opportunities}
            opportunitiesFilters={opportunitiesFilters}
            setOpportunitiesFilters={setOpportunitiesFilters}
            opportunitiesPagination={opportunitiesPagination}
            setOpportunitiesPagination={setOpportunitiesPagination}
            loading={loading}
            getPriorityColor={getPriorityColor}
          />
        )}

        {activeTab === 'competitors' && (
          <EPUCompetitorsTab
            competitors={competitors}
            competitorFilters={competitorFilters}
            setCompetitorFilters={setCompetitorFilters}
            getThreatColor={getThreatColor}
          />
        )}

        {activeTab === 'alerts' && (
          <EPUAlertsTab
            alerts={alerts}
            alertsPriority={alertsPriority}
            setAlertsPriority={setAlertsPriority}
            getPriorityColor={getPriorityColor}
          />
        )}

        {activeTab === 'market-report' && (
          <EPUMarketReportTab marketReport={marketReport} />
        )}
      </div>
    </div>
  );
}
