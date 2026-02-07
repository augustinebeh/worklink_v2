import { Link } from 'react-router-dom';
import { BriefcaseIcon, ZapIcon } from 'lucide-react';
import { clsx } from 'clsx';
import {
  formatMoney,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  DEFAULT_LOCALE,
  TIMEZONE,
  calculateJobHours,
  isToday,
  isTomorrow,
} from '../../utils/constants';

export default function ActivityItem({ job }) {
  const slotsLeft = job.total_slots - job.filled_slots;
  const startTime = job.start_time || DEFAULT_START_TIME;
  const hours = calculateJobHours(startTime, job.end_time || DEFAULT_END_TIME, job.break_minutes);
  const totalPay = hours * job.pay_rate;
  const jobDate = new Date(job.job_date);
  const isJobToday = isToday(job.job_date);
  const isJobTomorrow = isTomorrow(job.job_date);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors rounded-xl group"
    >
      <div className="relative">
        <div className={clsx(
          'w-12 h-12 rounded-2xl flex items-center justify-center',
          job.featured ? 'bg-gradient-to-br from-emerald-500 to-cyan-500' : 'bg-gradient-to-br from-slate-700 to-slate-800'
        )}>
          <BriefcaseIcon className="h-5 w-5 text-white" />
        </div>
        {job.featured && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
            <ZapIcon className="h-2.5 w-2.5 text-amber-900" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs font-mono">{job.client_name?.substring(0, 12) || 'Client'}...</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40 text-xs">
            {isJobToday ? 'Today' : isJobTomorrow ? 'Tomorrow' : jobDate.toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', timeZone: TIMEZONE })}
          </span>
        </div>
        <h4 className="text-white font-medium truncate mt-0.5">{job.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            slotsLeft <= 3 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
          )}>
            {slotsLeft <= 3 ? `${slotsLeft} left` : 'Open'}
          </span>
        </div>
      </div>

      <div className="text-right">
        <p className="text-emerald-400 font-bold text-lg">${formatMoney(totalPay)}</p>
        <p className="text-white/40 text-xs">{hours.toFixed(1)}h</p>
      </div>
    </Link>
  );
}
