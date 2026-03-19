import React from 'react';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
  ComposedChart,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';

const formatCurrency = (value, compact = false) => {
  const num = Number(value) || 0;
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(num);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(num);
};

export default function RevenueGrowthChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue & Profit Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }}
                formatter={(value, name) => [name === 'growth' ? `${Number(value).toFixed(1)}%` : formatCurrency(value), name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Growth']}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGrad)" />
              <Area yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" />
              <Line yAxisId="right" type="monotone" dataKey="growth" name="Growth %" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
