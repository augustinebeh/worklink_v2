import {
  CheckCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { clsx } from 'clsx';
import { formatCurrency, MarginIndicator } from './FinancialSummaryCards';

export function UpcomingJobsTable({ data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Upcoming Jobs Breakdown</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Job</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Charge</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Pay</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Hours</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Slots</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Revenue</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Profit</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data?.projected?.upcomingJobs?.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900 dark:text-white">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.client_name}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{job.job_date}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">${job.charge_rate}</td>
                  <td className="py-3 px-4 text-right text-slate-600">${job.pay_rate}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{job.hours.toFixed(1)}h</td>
                  <td className="py-3 px-4 text-right text-slate-600">{job.filled_slots}/{job.total_slots}</td>
                  <td className="py-3 px-4 text-right font-medium text-blue-600">{formatCurrency(job.projected_revenue)}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatCurrency(job.projected_profit)}</td>
                  <td className="py-3 px-4 text-center"><MarginIndicator margin={parseFloat(job.margin_percent)} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/50 font-medium">
                <td colSpan={6} className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">Total Projected:</td>
                <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(data?.projected?.revenue)}</td>
                <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(data?.projected?.profit)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarginByClientTable({ data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Margin Analysis by Client</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.marginByClient?.map((client) => (
            <div key={client.client_id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{client.company_name}</p>
                  <p className="text-sm text-slate-500">{client.jobs} jobs • {client.deployments} deployments</p>
                </div>
                <MarginIndicator margin={client.avg_margin || 0} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-xs text-slate-500">Revenue</p>
                  <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(client.total_revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Profit</p>
                  <p className="font-medium text-emerald-600">{formatCurrency(client.total_profit)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Avg Margin</p>
                  <p className="font-medium text-slate-900 dark:text-white">{(client.avg_margin || 0).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RateSpreadTable({ data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Charge Rate vs Pay Rate by Job</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Job</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Client</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Charge Rate</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Pay Rate</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Spread</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data?.rateAnalysis?.byJob?.map((job, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{job.title}</td>
                  <td className="py-3 px-4 text-slate-600">{job.company_name}</td>
                  <td className="py-3 px-4 text-right font-medium">${job.charge_rate.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">${job.pay_rate.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">${job.spread.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center"><MarginIndicator margin={job.margin_percent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function IncentiveProtectionNotice() {
  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-800">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/50"><AlertTriangleIcon className="h-6 w-6 text-amber-600" /></div>
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">Margin Protection Active</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            All incentives are capped to maintain a minimum <strong>20% gross margin</strong> on every deployment.
            The system will automatically reduce or block incentives if they would cause the margin to fall below this threshold.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function TopPerformersTable({ data }) {
  return (
    <Card>
      <CardHeader><CardTitle>Top Profit Generators</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data?.topPerformers?.map((candidate, idx) => (
            <div key={candidate.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
              )}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white">{candidate.name}</p>
                <p className="text-xs text-slate-500">Level {candidate.level} • {candidate.total_jobs_completed} jobs • {candidate.rating?.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{formatCurrency(candidate.profit_generated)}</p>
                <p className="text-xs text-slate-500">{candidate.total_hours?.toFixed(0)}h worked</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CalculatorForm({ calculator, setCalculator, calculateProfit, calcResult }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Job Profitability Calculator</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Charge Rate ($/hr)" type="number" value={calculator.charge_rate} onChange={(e) => setCalculator({ ...calculator, charge_rate: e.target.value })} />
              <Input label="Pay Rate ($/hr)" type="number" value={calculator.pay_rate} onChange={(e) => setCalculator({ ...calculator, pay_rate: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Hours/Day" type="number" value={calculator.hours} onChange={(e) => setCalculator({ ...calculator, hours: e.target.value })} />
              <Input label="Days" type="number" value={calculator.days} onChange={(e) => setCalculator({ ...calculator, days: e.target.value })} min="1" />
              <Input label="Headcount" type="number" value={calculator.headcount} onChange={(e) => setCalculator({ ...calculator, headcount: e.target.value })} />
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
              <span className="text-slate-500">Total Hours: </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {(parseFloat(calculator.hours || 0) * parseInt(calculator.days || 1)).toFixed(1)}h
              </span>
              <span className="text-slate-400 ml-2">({calculator.hours}h x {calculator.days} day{calculator.days > 1 ? 's' : ''} x {calculator.headcount} people)</span>
            </div>
            <Input label="Estimated Incentives ($)" type="number" value={calculator.incentives} onChange={(e) => setCalculator({ ...calculator, incentives: e.target.value })} />
            <Button onClick={calculateProfit} className="w-full">Calculate</Button>
          </div>
        </CardContent>
      </Card>

      {calcResult && <CalculatorResults calcResult={calcResult} />}
    </div>
  );
}

function CalculatorResults({ calcResult }) {
  return (
    <Card>
      <CardHeader><CardTitle>Results</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-blue-600">Gross Revenue</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(calcResult.grossRevenue)}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-slate-600">Candidate Costs</p>
              <p className="text-2xl font-bold text-slate-700">{formatCurrency(calcResult.candidateCosts)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-sm text-emerald-600">Gross Profit</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calcResult.grossProfit)}</p>
              <p className="text-xs text-emerald-600">{calcResult.grossMarginPercent}% margin</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <p className="text-sm text-purple-600">Net Profit</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(calcResult.netProfit)}</p>
              <p className="text-xs text-purple-600">{calcResult.netMarginPercent}% margin</p>
            </div>
          </div>

          <div className={clsx('p-4 rounded-lg', calcResult.meetsMinMargin ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
            <div className="flex items-center gap-2">
              {calcResult.meetsMinMargin ? <CheckCircleIcon className="h-5 w-5 text-emerald-600" /> : <AlertTriangleIcon className="h-5 w-5 text-red-600" />}
              <span className={clsx('font-medium', calcResult.meetsMinMargin ? 'text-emerald-700' : 'text-red-700')}>
                {calcResult.meetsMinMargin ? 'Meets minimum 20% margin requirement' : 'Below minimum 20% margin!'}
              </span>
            </div>
            {!calcResult.meetsMinMargin && (
              <p className="text-sm text-red-600 mt-2">
                Suggested charge rate: <strong>${calcResult.suggestedChargeRate}/hr</strong> to achieve 20% margin
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-600 mb-2">Max Allowable Incentive (to maintain 20% margin):</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(calcResult.maxIncentive)}</p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Per Person Breakdown:</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-slate-500">Revenue:</span> {formatCurrency(calcResult.perPersonBreakdown.revenue)}</div>
              <div><span className="text-slate-500">Cost:</span> {formatCurrency(calcResult.perPersonBreakdown.cost)}</div>
              <div><span className="text-slate-500">Profit:</span> {formatCurrency(calcResult.perPersonBreakdown.profit)}</div>
            </div>
            {calcResult.days > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Per Person Per Day:</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-slate-500">Revenue:</span> {formatCurrency(calcResult.perPersonBreakdown.revenue / calcResult.days)}</div>
                  <div><span className="text-slate-500">Cost:</span> {formatCurrency(calcResult.perPersonBreakdown.cost / calcResult.days)}</div>
                  <div><span className="text-slate-500">Profit:</span> {formatCurrency(calcResult.perPersonBreakdown.profit / calcResult.days)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
