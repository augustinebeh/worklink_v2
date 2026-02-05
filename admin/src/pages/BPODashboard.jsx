import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  SearchIcon, 
  RefreshCwIcon, 
  ExternalLinkIcon,
  DollarSignIcon,
  UsersIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  LightbulbIcon,
  GlobeIcon,
  ChevronRightIcon,
  BuildingIcon,
  BriefcaseIcon,
  RssIcon,
  BotIcon,
  TagIcon,
  AlertCircleIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge, { StatusBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { clsx } from 'clsx';
import { tenderService } from '../shared/services/api';
import { useToast } from '../components/ui/Toast';

function BPOKPICard({ title, value, subtitle, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
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

function TenderCard({ tender, onClick }) {
  const daysUntilClose = Math.ceil((new Date(tender.closing_date) - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntilClose <= 7 && daysUntilClose > 0;

  return (
    <div onClick={onClick} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge variant="info" className="text-2xs">{tender.source?.toUpperCase()}</Badge>
        {isUrgent && <Badge variant="error" className="text-2xs">{daysUntilClose}d left</Badge>}
      </div>
      <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2 mb-2">{tender.title}</h4>
      <p className="text-xs text-slate-500 mb-3">{tender.agency}</p>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <UsersIcon className="h-3 w-3" />
          <span>{tender.manpower_required || '?'} pax</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 font-medium">
          <DollarSignIcon className="h-3 w-3" />
          <span>${((tender.estimated_value || 0) / 1000).toFixed(0)}K</span>
        </div>
      </div>
      {tender.win_probability && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Win Probability</span>
            <span className={clsx('font-medium', tender.win_probability >= 60 ? 'text-emerald-600' : tender.win_probability >= 40 ? 'text-amber-600' : 'text-slate-500')}>
              {tender.win_probability}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PortalCard({ portal }) {
  const priorityColors = {
    essential: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Card hover className="h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">{portal.name}</h4>
            {portal.priority && (
              <span className={clsx('text-2xs px-2 py-0.5 rounded-full font-medium uppercase', priorityColors[portal.priority])}>
                {portal.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{portal.description}</p>
          {portal.categories && (
            <div className="flex flex-wrap gap-1 mt-3">
              {portal.categories.slice(0, 3).map((cat, idx) => (
                <Badge key={idx} variant="neutral" className="text-2xs">{cat}</Badge>
              ))}
              {portal.categories.length > 3 && (
                <Badge variant="neutral" className="text-2xs">+{portal.categories.length - 3}</Badge>
              )}
            </div>
          )}
          {portal.tip && (
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-3">💡 {portal.tip}</p>
          )}
          {portal.features && (
            <div className="flex flex-wrap gap-1 mt-3">
              {portal.features.map((feat, idx) => (
                <span key={idx} className="text-2xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                  {feat}
                </span>
              ))}
            </div>
          )}
          {portal.cost && (
            <p className="text-xs text-slate-500 mt-2">💰 {portal.cost}</p>
          )}
        </div>
        <a 
          href={portal.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ExternalLinkIcon className="h-5 w-5 text-slate-400" />
        </a>
      </div>
    </Card>
  );
}

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

      // Show success toast only if we have data
      if (tendersRes.success || statsRes.success || recsRes.success) {
        toast.success('Data Loaded', 'BPO dashboard updated successfully');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  const formatCurrency = (value) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);

  const columns = [
    { header: 'Tender', accessor: 'title', render: (value, row) => (<div><p className="font-medium text-slate-900 dark:text-white line-clamp-1">{value}</p><p className="text-xs text-slate-500">{row.external_id}</p></div>) },
    { header: 'Agency', accessor: 'agency' },
    { header: 'Value', accessor: 'estimated_value', render: (value) => <span className="font-medium text-emerald-600">{formatCurrency(value)}</span> },
    { header: 'Headcount', accessor: 'manpower_required', render: (value) => <div className="flex items-center gap-1.5"><UsersIcon className="h-4 w-4 text-slate-400" /><span>{value || '-'}</span></div> },
    { header: 'Win %', accessor: 'win_probability', render: (value) => value ? <span className={clsx('font-medium', value >= 60 ? 'text-emerald-600' : value >= 40 ? 'text-amber-600' : 'text-slate-500')}>{value}%</span> : '-' },
    { header: 'Status', accessor: 'status', render: (value) => <StatusBadge status={value} /> },
  ];

  // Get portals by category
  const governmentPortals = recommendations?.governmentPortals || [];
  const privatePortals = recommendations?.privatePortals || [];
  const aggregatorTools = recommendations?.aggregatorTools || [];
  const automationTools = recommendations?.automationTools || [];
  const searchKeywords = recommendations?.searchKeywords || [];

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
        {[
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'recommendations', label: 'Recommendations' },
          { id: 'portals', label: 'Tender Portals' },
          { id: 'tools', label: 'Scraping Tools' },
          { id: 'keywords', label: 'Keywords' },
        ].map((tab) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BPOKPICard title="Active Tenders" value={(stats?.new || 0) + (stats?.reviewing || 0) + (stats?.bidding || 0)} subtitle="In pipeline" icon={SearchIcon} color="primary" />
            <BPOKPICard title="Total Value" value={formatCurrency(stats?.totalValue)} subtitle="Potential revenue" icon={DollarSignIcon} color="success" />
            <BPOKPICard title="Bids Submitted" value={stats?.submitted || 0} subtitle="Awaiting result" icon={CheckCircleIcon} color="info" />
            <BPOKPICard title="Won This Year" value={stats?.won || 0} subtitle={formatCurrency(stats?.wonValue)} icon={TrendingUpIcon} color="success" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {['kanban', 'table'].map((v) => (
                <button key={v} onClick={() => setView(v)} className={clsx('px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize', view === v ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-slate-600 hover:bg-slate-100')}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input placeholder="Search tenders..." icon={SearchIcon} className="w-64" />
              <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'All Statuses' }, { value: 'new', label: 'New' }, { value: 'reviewing', label: 'Reviewing' }, { value: 'bidding', label: 'Bidding' }, { value: 'submitted', label: 'Submitted' }]} className="w-40" />
            </div>
          </div>

          {view === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(tendersByStatus).map(([status, statusTenders]) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{status}</h3>
                    <Badge variant="neutral">{statusTenders.length}</Badge>
                  </div>
                  <div className="space-y-3 min-h-[200px]">
                    {statusTenders.map((tender) => <TenderCard key={tender.id} tender={tender} />)}
                    {statusTenders.length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">No tenders</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'table' && (
            <Card padding="none">
              <Table columns={columns} data={tenders} loading={loading} emptyMessage="No tenders found" />
            </Card>
          )}
        </>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && recommendations && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-slate-900 border-primary-200 dark:border-primary-800">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/50">
                <LightbulbIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">2026 Acquisition Intelligence</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Strategic recommendations based on Singapore tender market analysis and competitive intelligence.
                </p>
              </div>
            </div>
          </Card>

          {recommendations.recommendations?.map((category, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle>{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.items?.map((item, itemIdx) => (
                    <div key={itemIdx} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <h4 className="font-medium text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.insight}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                        <ChevronRightIcon className="h-4 w-4" />
                        <span>{item.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tender Portals Tab */}
      {activeTab === 'portals' && (
        <div className="space-y-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                <GlobeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Singapore Tender Portals</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Government and private sector portals for ad-hoc manpower tenders. Register on these to expand your opportunities.
                </p>
              </div>
            </div>
          </Card>

          {/* Portal Sub-tabs */}
          <div className="flex gap-2">
            {[
              { id: 'government', label: 'Government & GLCs', icon: BuildingIcon },
              { id: 'private', label: 'Private Sector', icon: BriefcaseIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPortalTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  portalTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portalTab === 'government' && governmentPortals.map((portal, idx) => (
              <PortalCard key={idx} portal={portal} />
            ))}
            {portalTab === 'private' && privatePortals.map((portal, idx) => (
              <PortalCard key={idx} portal={portal} />
            ))}
          </div>
        </div>
      )}

      {/* Scraping Tools Tab */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <BotIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Automatic Tender Monitoring</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Don't scrape GeBIZ directly (strong anti-bot protection). Use these aggregators and automation tools instead.
                </p>
              </div>
            </div>
          </Card>

          {/* Aggregators Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <RssIcon className="h-5 w-5 text-amber-500" />
              Done-for-You Aggregators (Recommended)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregatorTools.map((tool, idx) => (
                <PortalCard key={idx} portal={tool} />
              ))}
            </div>
          </div>

          {/* DIY Tools Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BotIcon className="h-5 w-5 text-primary-500" />
              Build Your Own (For Power Users)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {automationTools.map((tool, idx) => (
                <Card key={idx} hover>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{tool.name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tool.description}</p>
                      {tool.features && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {tool.features.map((feat, fidx) => (
                            <span key={fidx} className="text-2xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                              {feat}
                            </span>
                          ))}
                        </div>
                      )}
                      {tool.setup && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <p className="text-xs text-slate-500 whitespace-pre-line">{tool.setup}</p>
                        </div>
                      )}
                      {tool.cost && (
                        <p className="text-xs text-emerald-600 mt-2">💰 {tool.cost}</p>
                      )}
                    </div>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                      <ExternalLinkIcon className="h-5 w-5 text-slate-400" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="space-y-6">
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                <TagIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Search Keywords for Scraping</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Use these exact strings in your alerts to catch ad-hoc manpower tenders. Copy and paste into GeBIZ alerts or aggregator filters.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircleIcon className="h-5 w-5 text-red-500" />
                Essential Keywords (Must Use)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchKeywords.filter(k => typeof k === 'string' || k.priority === 'essential').slice(0, 5).map((keyword, idx) => {
                  const text = typeof keyword === 'string' ? keyword : keyword.keyword;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <code className="text-sm font-mono text-slate-700 dark:text-slate-300">"{text}"</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(text)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Copy
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(Array.isArray(searchKeywords) ? searchKeywords : []).map((keyword, idx) => {
                  const text = typeof keyword === 'string' ? keyword : keyword.keyword;
                  const notes = typeof keyword === 'object' ? keyword.notes : null;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <code className="text-sm font-mono text-slate-700 dark:text-slate-300">"{text}"</code>
                        {notes && <p className="text-xs text-slate-500 mt-1">{notes}</p>}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(text)}
                        className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
                      >
                        Copy
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Copy All */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">Copy All Keywords</h4>
                <p className="text-sm text-slate-500 mt-1">Copy all keywords at once for bulk setup</p>
              </div>
              <Button 
                size="sm"
                onClick={() => {
                  const allKeywords = searchKeywords.map(k => typeof k === 'string' ? k : k.keyword).join('\n');
                  navigator.clipboard.writeText(allKeywords);
                }}
              >
                Copy All
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
