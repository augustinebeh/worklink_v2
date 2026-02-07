import { TrendingUpIcon } from 'lucide-react';
import {
  formatMoney,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  calculateJobHours,
  isToday,
} from '../../utils/constants';

export default function EarningsPotentialCard({ jobs }) {
  const todayJobs = jobs.filter(job => isToday(job.job_date));
  const totalHours = todayJobs.reduce((sum, job) => {
    const hours = calculateJobHours(
      job.start_time || DEFAULT_START_TIME,
      job.end_time || DEFAULT_END_TIME,
      job.break_minutes
    );
    return sum + hours;
  }, 0);

  const avgPayRate = todayJobs.length > 0
    ? todayJobs.reduce((sum, job) => sum + job.pay_rate, 0) / todayJobs.length
    : 15;

  const potentialEarnings = totalHours * avgPayRate;

  if (todayJobs.length === 0) return null;

  return (
    <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
          <TrendingUpIcon className="h-6 w-6 text-emerald-400" />
        </div>

        <div className="flex-1">
          <h3 className="text-white font-bold mb-1">Today's Earning Potential</h3>
          <p className="text-white/60 text-sm mb-2">
            Based on {totalHours.toFixed(1)}h available jobs near you
          </p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-emerald-400">
              ${formatMoney(potentialEarnings)}
            </div>
            <span className="text-white/40 text-sm">possible today</span>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/jobs'}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm hover:shadow-lg transition-all"
        >
          Find Jobs →
        </button>
      </div>
    </div>
  );
}
