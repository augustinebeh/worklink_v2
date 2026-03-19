import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { formatCurrency } from './FinancialSummaryCards';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function RevenueProfitTrend({ data }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>Revenue & Profit Trend</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickFormatter={(v) => v?.substring(5)} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name="Candidate Pay" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="net_profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientRevenueBreakdown({ data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Revenue by Client</CardTitle></CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data?.marginByClient?.slice(0, 5) || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="total_revenue" nameKey="company_name">
                {data?.marginByClient?.slice(0, 5).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 mt-4">
          {data?.marginByClient?.slice(0, 5).map((client, idx) => (
            <div key={client.client_id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{client.company_name}</span>
              </div>
              <span className="font-medium">{formatCurrency(client.total_revenue, true)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectionsVsActualChart({ data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Monthly Projections vs Actual</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.financialProjections || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickFormatter={(v) => v?.substring(5)} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => value ? formatCurrency(value) : 'N/A'} />
              <Legend />
              <Bar dataKey="projected_profit" name="Projected Profit" fill="#94a3b8" />
              <Bar dataKey="actual_profit" name="Actual Profit" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
