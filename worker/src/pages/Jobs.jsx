import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  ClockIcon,
  ZapIcon,
  SearchIcon,
  CalendarIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  BriefcaseIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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

function JobCard({ job, applied, isDark }) {
  const startTime = job.start_time || DEFAULT_START_TIME;
  const endTime = job.end_time || DEFAULT_END_TIME;
  const hours = calculateJobHours(startTime, endTime, job.break_minutes);
  const totalPay = hours * job.pay_rate;

  const jobDate = new Date(job.job_date);
  const isToday = checkIsToday(job.job_date);
  const isTomorrow = checkIsTomorrow(job.job_date);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={clsx(
        'block p-4 rounded-2xl border transition-all',
        isDark
          ? applied
            ? 'bg-accent-900/10 border-accent-500/30'
            : 'bg-dark-900/50 border-white/5 hover:border-primary-500/30'
          : applied
            ? 'bg-[#B0DEED]/30 border-[#80CCE3]'
            : 'bg-white border-[#C2DAE6] shadow-sm hover:border-[#80CCE3]'
      )}
    >
      {/* Status badges */}
      <div className="flex items-center gap-2 mb-2">
        {job.featured === 1 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
            <ZapIcon className="h-3 w-3" /> Featured
          </span>
        )}
        {isToday && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">Today</span>
        )}
        {isTomorrow && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">Tomorrow</span>
        )}
        {applied && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" /> Applied
          </span>
        )}
      </div>

      {/* Title & Company */}
      <h3 className={clsx('font-semibold text-lg', isDark ? 'text-white' : 'text-slate-900')}>{job.title}</h3>
      <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>{job.company_name || job.location}</p>

      {/* Details */}
      <div className={clsx('flex flex-wrap items-center gap-3 mt-3 text-sm', isDark ? 'text-dark-300' : 'text-slate-600')}>
        <div className="flex items-center gap-1">
          <CalendarIcon className={clsx('h-4 w-4', isDark ? 'text-dark-500' : 'text-slate-400')} />
          <span>{jobDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: TIMEZONE })}</span>
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className={clsx('h-4 w-4', isDark ? 'text-dark-500' : 'text-slate-400')} />
          <span>{startTime} - {endTime}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPinIcon className={clsx('h-4 w-4', isDark ? 'text-dark-500' : 'text-slate-400')} />
          <span className="truncate max-w-[120px]">{job.location}</span>
        </div>
      </div>

      {/* Pay & Slots */}
      <div className={clsx('flex items-center justify-between mt-4 pt-3 border-t', isDark ? 'border-white/5' : 'border-slate-100')}>
        <div>
          <p className="text-xl font-bold text-accent-400">${formatMoney(totalPay)}</p>
          <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>${formatMoney(job.pay_rate)}/hr • {hours.toFixed(1)}h</p>
        </div>
        <div className="flex items-center gap-3">
          {job.xp_bonus > 0 && (
            <div className="flex items-center gap-1 text-primary-400">
              <ZapIcon className="h-4 w-4" />
              <span className="text-sm font-medium">+{job.xp_bonus} XP</span>
            </div>
          )}
          <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>
            {job.total_slots - job.filled_slots} slots
          </span>
          <ChevronRightIcon className={clsx('h-5 w-5', isDark ? 'text-dark-500' : 'text-slate-400')} />
        </div>
      </div>
    </Link>
  );
}

export default function Jobs() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, available, applied
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    try {
      const [jobsRes, myJobsRes] = await Promise.all([
        fetch('/api/v1/jobs?status=open'),
        user ? fetch(`/api/v1/candidates/${user.id}/deployments`) : Promise.resolve({ json: () => ({ data: [] }) }),
      ]);

      const jobsData = await jobsRes.json();
      const myJobsData = await myJobsRes.json();

      if (jobsData.success) setJobs(jobsData.data);
      if (myJobsData.success) setMyJobs(myJobsData.data.map(d => d.job_id));
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    // Search filter
    if (search) {
      const query = search.toLowerCase();
      if (!job.title.toLowerCase().includes(query) &&
          !job.location?.toLowerCase().includes(query) &&
          !job.company_name?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filter === 'applied') return myJobs.includes(job.id);
    if (filter === 'available') return !myJobs.includes(job.id);
    return true;
  });

  // Sort: featured first, then by date
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (a.featured !== b.featured) return b.featured - a.featured;
    return new Date(a.job_date) - new Date(b.job_date);
  });

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-transparent')}>
      {/* Search & Filters */}
      <div className={clsx(
        'px-4 pt-4 pb-4',
        isDark ? 'bg-dark-950' : 'bg-transparent'
      )}>
        {/* Search */}
        <div className="relative mb-4">
          <SearchIcon className={clsx('absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5', isDark ? 'text-dark-500' : 'text-[#94BDCF]')} />
          <input
            type="text"
            placeholder="Search jobs, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={clsx(
              'w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:border-primary-500',
              isDark
                ? 'bg-dark-800 border-white/10 text-white placeholder-dark-500'
                : 'bg-white border-[#C2DAE6] text-slate-900 placeholder-[#94BDCF]'
            )}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Jobs' },
            { id: 'available', label: 'Available' },
            { id: 'applied', label: 'Applied' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-primary-500 text-white'
                  : isDark
                    ? 'bg-dark-800 text-dark-400 hover:text-white'
                    : 'bg-white text-[#94BDCF] hover:text-slate-700 border border-[#C2DAE6]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs list */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className={clsx(
            'text-center py-12 rounded-2xl border',
            isDark ? 'bg-dark-900/50 border-white/5' : 'bg-white border-slate-200'
          )}>
            <BriefcaseIcon className={clsx('h-12 w-12 mx-auto mb-4', isDark ? 'text-dark-600' : 'text-slate-300')} />
            <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>No jobs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map(job => (
              <JobCard key={job.id} job={job} applied={myJobs.includes(job.id)} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
