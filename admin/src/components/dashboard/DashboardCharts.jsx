import { Link } from 'react-router-dom';
import {
  TrendingUpIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  BookOpenIcon,
  UsersIcon,
  DollarSignIcon,
  TargetIcon,
  StarIcon,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { clsx } from 'clsx';

const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(value || 0);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);
};

const guideCards = [
  { title: 'Recruitment Basics', description: 'How to build your worker pool', icon: UsersIcon, color: 'blue', articles: 5 },
  { title: 'Pricing Strategy', description: 'Setting rates that win & profit', icon: DollarSignIcon, color: 'emerald', articles: 4 },
  { title: 'Tender Bidding', description: 'Win government contracts', icon: TargetIcon, color: 'purple', articles: 6 },
  { title: 'Worker Retention', description: 'Keep your best talent', icon: StarIcon, color: 'amber', articles: 3 },
];

export default function DashboardCharts({ loading, profitChartData }) {
  return (
    <>
      {/* Profit Growth Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Growth Journey</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                <span className="text-emerald-600 font-medium">Green bars = your profit</span> - This is what you keep!
              </p>
            </div>
            <Link to="/financials" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
              Deep dive <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : profitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }}
                    formatter={(value, name) => [formatCurrency(value), name === 'grossProfit' ? 'Profit' : name === 'revenue' ? 'Revenue' : 'Costs']}
                  />
                  <Legend formatter={(value) => value === 'grossProfit' ? 'Your Profit' : value === 'revenue' ? 'Total Revenue' : 'Worker Costs'} />
                  <Bar dataKey="costs" fill="#94a3b8" radius={[4, 4, 0, 0]} name="costs" stackId="stack" />
                  <Bar dataKey="grossProfit" fill="url(#profitGradient)" stroke="#10b981" strokeWidth={2} radius={[4, 4, 0, 0]} name="grossProfit" stackId="stack" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <TrendingUpIcon className="h-12 w-12 mb-2 opacity-50" />
                <p>Complete your first deployment to see your growth!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Learning Resources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCapIcon className="h-5 w-5 text-primary-500" />
            Learn & Grow
          </h3>
          <Link to="/training"><Button variant="secondary" size="sm">View All Guides</Button></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {guideCards.map((guide) => {
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600',
              emerald: 'from-emerald-500 to-emerald-600',
              purple: 'from-purple-500 to-purple-600',
              amber: 'from-amber-500 to-amber-600',
            };
            return (
              <Card key={guide.title} hover className="cursor-pointer">
                <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3', colorClasses[guide.color])}>
                  <guide.icon className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{guide.title}</h4>
                <p className="text-sm text-slate-500 mt-1">{guide.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                  <BookOpenIcon className="h-3 w-3" />
                  <span>{guide.articles} articles</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
