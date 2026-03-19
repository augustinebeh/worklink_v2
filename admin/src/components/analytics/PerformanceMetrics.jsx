import React from 'react';
import {
  TargetIcon,
  ClockIcon,
  AwardIcon,
  StarIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { clsx } from 'clsx';

const formatCurrency = (value, compact = false) => {
  const num = Number(value) || 0;
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(num);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(num);
};

export function TopPerformersCard({ performers }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performers.map((candidate, idx) => (
            <div key={candidate.id} className="flex items-center gap-3">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
              )}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{candidate.name}</p>
                <p className="text-xs text-slate-500">{candidate.deployments} jobs &bull; Level {candidate.level}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-600">{formatCurrency(candidate.profit_generated, true)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TenderPipelineCard({ tenderData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tender Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <TargetIcon className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Active Tenders</span>
            </div>
            <span className="font-bold text-lg text-blue-600">{tenderData?.active || 8}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <ClockIcon className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Submitted</span>
            </div>
            <span className="font-bold text-lg text-amber-600">{tenderData?.submitted || 3}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <AwardIcon className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Won</span>
            </div>
            <span className="font-bold text-lg text-emerald-600">{tenderData?.won || 2}</span>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">Pipeline Value</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(tenderData?.pipelineValue || 450000, true)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BusinessHealthCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">Fill Rate</span>
              <span className="font-medium text-slate-900 dark:text-white">78%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">Candidate Retention</span>
              <span className="font-medium text-slate-900 dark:text-white">85%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">Client Satisfaction</span>
              <span className="font-medium text-slate-900 dark:text-white">92%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: '92%' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">On-Time Rate</span>
              <span className="font-medium text-slate-900 dark:text-white">96%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '96%' }} />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Avg Rating</span>
              <div className="flex items-center gap-1">
                <StarIcon className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-slate-900 dark:text-white">4.7</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
