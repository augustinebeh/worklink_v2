import {
  SearchIcon,
  PlayIcon,
  ZapIcon,
  CheckIcon,
  TrendingUpIcon,
  SparklesIcon,
  TargetIcon,
  ClockIcon,
  DollarSignIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
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

export { StatCard };

export default function AutomationDashboard({
  activeTab,
  stats,
  scraping,
  analyzing,
  onRunScrape,
  onAnalyzeAll,
}) {
  return (
    <>
      {/* Stats Grid */}
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

      {/* Scraper Tab Content */}
      {activeTab === 'scraper' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              onClick={onRunScrape}
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
      </div>}

      {/* Analyzer Section */}
      {activeTab === 'analyzer' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              onClick={onAnalyzeAll}
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
      </div>}
    </>
  );
}
