import { useState, useEffect } from 'react';
import {
  BotIcon,
  RefreshCwIcon,
  PlayIcon,
  ZapIcon,
  SearchIcon,
  CheckIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  SparklesIcon,
  ExternalLinkIcon,
  TargetIcon,
  FileTextIcon,
  ClockIcon,
  DollarSignIcon,
  MessageSquareIcon,
  SendIcon,
  Loader2Icon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { clsx } from 'clsx';

function StatCard({ title, value, subtitle, icon: Icon, color = 'primary' }) {
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

export default function AIAutomation() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scraper');
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recentTenders, setRecentTenders] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecentTenders();
    checkAiStatus();
  }, []);

  const checkAiStatus = async () => {
    try {
      const res = await fetch('/api/v1/ai/ai-status');
      const data = await res.json();
      if (data.success) setAiStatus(data.data);
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const askAI = async () => {
    if (!chatQuestion.trim()) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const res = await fetch('/api/v1/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatQuestion, context: 'tenders' }),
      });
      const data = await res.json();
      if (data.success) setChatResponse(data.data.answer);
      else setChatResponse('Error: ' + data.error);
    } catch (error) {
      setChatResponse('Failed to get response: ' + error.message);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/ai/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTenders = async () => {
    try {
      const res = await fetch('/api/v1/tenders?limit=10&sort=created_at:desc');
      const data = await res.json();
      if (data.success) setRecentTenders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch tenders:', error);
    }
  };

  const runGebizScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch('/api/v1/ai/gebiz/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: ['manpower', 'hr services', 'event support'] }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully scraped! Found ${data.data.newInserted} new tenders.`);
        fetchStats();
        fetchRecentTenders();
      }
    } catch (error) {
      alert('Scraping failed: ' + error.message);
    } finally {
      setScraping(false);
    }
  };

  const analyzeAllTenders = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/v1/ai/tenders/analyze-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Analyzed ${data.data.length} tenders!`);
        fetchStats();
        fetchRecentTenders();
      }
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <BotIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tender AI Tools</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                  BPO
                </span>
                {aiStatus?.enabled && (
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-semibold rounded flex items-center gap-1',
                    aiStatus.status === 'connected'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  )}>
                    <SparklesIcon className="h-3 w-3" />
                    Claude AI {aiStatus.status === 'connected' ? 'Ready' : 'Error'}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400">GeBIZ scraping & tender analysis</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={() => { fetchStats(); fetchRecentTenders(); }}>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="GeBIZ Tenders"
            value={stats.tenders?.totalScraped || 0}
            subtitle={`${stats.tenders?.pendingAnalysis || 0} pending analysis`}
            icon={SearchIcon}
            color="primary"
          />
          <StatCard
            title="High Priority"
            value={stats.tenders?.highPriority || 0}
            subtitle="Win probability ≥60%"
            icon={TargetIcon}
            color="success"
          />
          <StatCard
            title="Closing Soon"
            value={stats.tenders?.closingSoon || 0}
            subtitle="Within 7 days"
            icon={ClockIcon}
            color="warning"
          />
          <StatCard
            title="Est. Value"
            value={`$${((stats.tenders?.totalValue || 0) / 1000).toFixed(0)}K`}
            subtitle="Pipeline value"
            icon={DollarSignIcon}
            color="info"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'scraper', label: 'GeBIZ Scraper', icon: SearchIcon },
          { id: 'analyzer', label: 'AI Analyzer', icon: SparklesIcon },
          { id: 'recent', label: 'Recent Tenders', icon: FileTextIcon },
          { id: 'assistant', label: 'AI Assistant', icon: MessageSquareIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* GeBIZ Scraper Tab */}
      {activeTab === 'scraper' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SearchIcon className="h-5 w-5 text-amber-500" />
                GeBIZ Tender Scraper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Automatically scrape GeBIZ for new manpower and HR services tenders.
                The scraper searches for opportunities matching your business categories.
              </p>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Search Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {['Manpower Supply', 'HR Services', 'Event Support', 'Admin Support', 'Security Services'].map((cat) => (
                    <Badge key={cat} variant="warning">{cat}</Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={runGebizScrape}
                loading={scraping}
                loadingText="Scraping GeBIZ..."
                icon={PlayIcon}
                className="w-full"
              >
                Run Scraper Now
              </Button>

              <p className="text-xs text-slate-400 text-center">
                Last scraped: {stats?.tenders?.lastScraped || 'Never'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5 text-amber-500" />
                Scraper Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.tenders?.totalScraped || 0}</p>
                  <p className="text-sm text-slate-500">Total Scraped</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{stats?.tenders?.wonTenders || 0}</p>
                  <p className="text-sm text-slate-500">Won Tenders</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Pro Tip</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Run the scraper daily to catch new tenders early. Early submission often improves win rates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analyzer Tab */}
      {activeTab === 'analyzer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-amber-500" />
                AI Tender Analyzer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                AI analyzes tenders based on your company profile, past wins, and market conditions
                to predict win probability and recommend bid strategies.
              </p>

              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800">
                <h4 className="font-medium text-slate-900 dark:text-white mb-3">Analysis Factors</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    Contract size vs. your capacity
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    Category match to your track record
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    Time pressure (short deadlines = less competition)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    Margin assessment & pricing strategy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    Headcount vs. available candidates
                  </li>
                </ul>
              </div>

              <Button
                onClick={analyzeAllTenders}
                loading={analyzing}
                loadingText="Analyzing..."
                icon={ZapIcon}
                variant="secondary"
                className="w-full"
              >
                Analyze All Pending Tenders
              </Button>

              <p className="text-xs text-slate-400 text-center">
                {stats?.tenders?.pendingAnalysis || 0} tenders pending analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Win Probability Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">High (≥60%)</span>
                    <span className="font-medium text-emerald-600">{stats?.tenders?.highPriority || 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Medium (30-59%)</span>
                    <span className="font-medium text-amber-600">{stats?.tenders?.mediumPriority || 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Low (&lt;30%)</span>
                    <span className="font-medium text-slate-600">{stats?.tenders?.lowPriority || 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Focus on high-priority tenders for best ROI on your bidding efforts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Tenders Tab */}
      {activeTab === 'recent' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              Recently Scraped Tenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTenders.length > 0 ? (
              <div className="space-y-3">
                {recentTenders.map((tender) => (
                  <div
                    key={tender.id}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-white truncate">
                          {tender.title}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">{tender.agency}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant={tender.win_probability >= 60 ? 'success' : tender.win_probability >= 30 ? 'warning' : 'neutral'}>
                            {tender.win_probability || 0}% win prob
                          </Badge>
                          <span className="text-xs text-slate-400">
                            Closes: {tender.closing_date || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <a
                        href={tender.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <ExternalLinkIcon className="h-4 w-4 text-slate-400" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <FileTextIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">No Tenders Yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Run the GeBIZ scraper to fetch the latest tenders matching your business categories.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareIcon className="h-5 w-5 text-amber-500" />
                Ask Claude AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ask questions about tender strategy, bidding advice, pricing, or any BPO-related queries.
              </p>

              <div className="space-y-3">
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[120px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., What's a good pricing strategy for a 10-person admin support tender?"
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) askAI();
                  }}
                />
                <Button
                  onClick={askAI}
                  loading={chatLoading}
                  loadingText="Thinking..."
                  icon={SendIcon}
                  className="w-full"
                  disabled={!chatQuestion.trim() || !aiStatus?.enabled}
                >
                  Ask Claude
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Example Questions</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li className="cursor-pointer hover:text-amber-600" onClick={() => setChatQuestion("What factors should I consider when bidding for a government manpower tender?")}>
                    • What factors should I consider when bidding for a government manpower tender?
                  </li>
                  <li className="cursor-pointer hover:text-amber-600" onClick={() => setChatQuestion("How do I calculate a competitive charge rate for admin support staff?")}>
                    • How do I calculate a competitive charge rate for admin support staff?
                  </li>
                  <li className="cursor-pointer hover:text-amber-600" onClick={() => setChatQuestion("What are common reasons for losing GeBIZ tenders?")}>
                    • What are common reasons for losing GeBIZ tenders?
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-amber-500" />
                AI Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chatLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2Icon className="h-8 w-8 text-amber-500 animate-spin mb-4" />
                  <p className="text-sm text-slate-500">Claude is thinking...</p>
                </div>
              ) : chatResponse ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{chatResponse}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <MessageSquareIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">Ask a Question</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    {aiStatus?.enabled
                      ? 'Type your question and Claude AI will provide strategic advice for your tender decisions.'
                      : 'Claude AI is not configured. Add ANTHROPIC_API_KEY to your environment.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
