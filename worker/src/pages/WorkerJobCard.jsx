import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  ClockIcon,
  ZapIcon,
  CalendarIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  BriefcaseIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  formatMoney,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  DEFAULT_LOCALE,
  TIMEZONE,
  calculateJobHours,
  isToday as checkIsToday,
  isTomorrow as checkIsTomorrow,
} from '../utils/constants';

/**
 * WorkerJobCard - Individual job listing card for the worker jobs page
 */
export default function WorkerJobCard({ job, applied }) {
  const startTime = job.start_time || DEFAULT_START_TIME;
  const endTime = job.end_time || DEFAULT_END_TIME;
  const hours = calculateJobHours(startTime, endTime, job.break_minutes);
  const totalPay = hours * job.pay_rate;
  const slotsLeft = job.total_slots - job.filled_slots;

  const jobDate = new Date(job.job_date);
  const isToday = checkIsToday(job.job_date);
  const isTomorrow = checkIsTomorrow(job.job_date);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05] hover:border-emerald-500/30 transition-all group"
    >
      <div className="flex gap-4">
        {/* Job Icon */}
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
          job.featured
            ? 'bg-gradient-to-br from-emerald-500 to-cyan-500'
            : 'bg-gradient-to-br from-slate-700 to-slate-800'
        )}>
          <BriefcaseIcon className="h-6 w-6 text-white" />
        </div>

        {/* Job Info */}
        <div className="flex-1 min-w-0">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-1.5">
            {job.featured === 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">
                <ZapIcon className="h-3 w-3" /> Hot
              </span>
            )}
            {isToday && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">Today</span>
            )}
            {isTomorrow && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-medium">Tomorrow</span>
            )}
            {applied && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <CheckCircleIcon className="h-3 w-3" /> Applied
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-white text-lg truncate group-hover:text-emerald-400 transition-colors">
            {job.title}
          </h3>

          {/* Company */}
          <p className="text-white/40 text-sm truncate">{job.company_name || job.location}</p>

          {/* Details Row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/50">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{jobDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: TIMEZONE })}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              <span>{startTime} - {endTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5" />
              <span className="truncate max-w-[100px]">{job.location}</span>
            </div>
          </div>
        </div>

        {/* Pay & Action */}
        <div className="flex flex-col items-end justify-between">
          <div className="text-right">
            <p className="text-xl font-bold text-emerald-400">${formatMoney(totalPay)}</p>
            <p className="text-xs text-white/40">{hours.toFixed(1)}h</p>
          </div>
          <div className="flex items-center gap-2">
            {slotsLeft <= 3 ? (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                {slotsLeft} left
              </span>
            ) : (
              <span className="text-xs text-white/40">{slotsLeft} slots</span>
            )}
            <ChevronRightIcon className="h-5 w-5 text-white/30 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* XP Bonus Bar */}
      {job.xp_bonus > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
          <ZapIcon className="h-4 w-4 text-violet-400" />
          <span className="text-sm text-violet-400 font-medium">+{job.xp_bonus} XP Bonus</span>
        </div>
      )}
    </Link>
  );
}
