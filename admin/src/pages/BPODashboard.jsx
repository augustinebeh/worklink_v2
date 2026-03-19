import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCwIcon,
  BotIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { clsx } from 'clsx';
import { tenderService } from "../shared/services/api";
import { useToast } from '../components/ui/Toast';
import BPOStatsCards from '../components/bpo/BPOStatsCards';
import BPOPipelineChart from '../components/bpo/BPOPipelineChart';
import BPORecentTenders from '../components/bpo/BPORecentTenders';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
  }).format(value || 0);

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'portals', label: 'Tender Portals' },
  { id: 'tools', label: 'Scraping Tools' },
  { id: 'keywords', label: 'Keywords' },
];

export default function BPODashboard() {
  const [tenders, setTenders] = useState([]);
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('pipeline');
  const [portalTab, setPortalTab] = useState('government');
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const [tendersRes, statsRes, recsRes] = await Promise.all([
        tenderService.getAll(params),
        tenderService.getStats(),
        tenderService.getRecommendations(),
      ]);

      if (tendersRes.success) setTenders(tendersRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (recsRes.success) setRecommendations(recsRes.data);

      if (tendersRes.success || statsRes.success || recsRes.success) {
        toast.success('Data Loaded', 'BPO dashboard updated successfully');
      }
    } catch (error) {
      toast.error('Loading Failed', 'Unable to fetch BPO dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const tendersByStatus = {
    new: tenders.filter(t => t.status === 'new'),
    reviewing: tenders.filter(t => t.status === 'reviewing'),
    bidding: tenders.filter(t => t.status === 'bidding'),
    submitted: tenders.filter(t => t.status === 'submitted'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">BPO Automation</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Government tender tracking and acquisition intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/ai-automation">
            <Button variant="secondary" size="sm" icon={BotIcon}>AI Tools</Button>
          </Link>
          <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <>
          <BPOStatsCards stats={stats} formatCurrency={formatCurrency} />
          <BPOPipelineChart
            tenders={tenders}
            tendersByStatus={tendersByStatus}
            loading={loading}
            view={view}
            setView={setView}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            formatCurrency={formatCurrency}
          />
        </>
      )}

      {/* Recommendations, Portals, Tools, Keywords Tabs */}
      <BPORecentTenders
        activeTab={activeTab}
        recommendations={recommendations}
        portalTab={portalTab}
        setPortalTab={setPortalTab}
      />
    </div>
  );
}
