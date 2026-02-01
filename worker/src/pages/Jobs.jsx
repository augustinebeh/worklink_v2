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
  ChevronLeftIcon,
  AlertCircleIcon,
  ClockIcon as PendingIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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

// Pending Account Banner
function PendingAccountBanner() {
  return (
    <div className="mx-4 mt-4 p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <PendingIcon className="h-7 w-7 text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">Account Pending Approval</h2>
          <p className="text-white/60 text-sm mb-4">
            Your account is being reviewed. Once approved, you'll be able to browse and apply for jobs.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
              <span className="text-white/70">Account created successfully</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-amber-400">Awaiting admin approval</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full border border-white/20" />
              <span className="text-white/40">Browse & apply for jobs</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40">
          This usually takes 1-2 business days. You'll receive a notification when your account is approved.
        </p>
      </div>
    </div>
  );
}

function JobCard({ job, applied }) {
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

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon className="h-5 w-5 text-white/60" />
      </button>
      
      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
        let pageNum;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }
        
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={clsx(
              'w-9 h-9 rounded-lg text-sm font-medium transition-all',
              currentPage === pageNum
                ? 'bg-emerald-500 text-white'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            )}
          >
            {pageNum}
          </button>
        );
      })}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRightIcon className="h-5 w-5 text-white/60" />
      </button>
    </div>
  );
}

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;

  // Check if user is pending
  const isPending = user?.status === 'pending' || user?.status === 'lead';

  useEffect(() => {
    if (!isPending) {
      fetchJobs();
    } else {
      setLoading(false);
    }
  }, [user, isPending]);

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

  // Show pending banner if user is pending
  if (isPending) {
    return (
      <div className="min-h-screen bg-[#020817] pb-24">
        <PendingAccountBanner />
        
        {/* Sample jobs preview (blurred) */}
        <div className="px-4 mt-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            Available Jobs Preview
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">Locked</span>
          </h3>
          <div className="space-y-3 relative">
            {/* Blur overlay */}
            <div className="absolute inset-0 bg-[#020817]/60 backdrop-blur-md z-10 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <AlertCircleIcon className="h-12 w-12 mx-auto mb-3 text-amber-400" />
                <p className="text-white font-medium">Account pending approval</p>
                <p className="text-white/50 text-sm mt-1">Jobs will be visible once approved</p>
              </div>
            </div>
            
            {/* Placeholder cards */}
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-white/5 rounded w-20" />
                      <div className="h-3 bg-white/5 rounded w-16" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-6 bg-emerald-500/20 rounded w-16 mb-1" />
                    <div className="h-3 bg-white/5 rounded w-10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredJobs = jobs.filter(job => {
    if (search) {
      const query = search.toLowerCase();
      if (!job.title.toLowerCase().includes(query) &&
          !job.location?.toLowerCase().includes(query) &&
          !job.company_name?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filter === 'applied') return myJobs.includes(job.id);
    if (filter === 'available') return !myJobs.includes(job.id);
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (a.featured !== b.featured) return b.featured - a.featured;
    return new Date(a.job_date) - new Date(b.job_date);
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / jobsPerPage);
  const paginatedJobs = sortedJobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Find Jobs</h1>
            <p className="text-white/40 text-sm">{sortedJobs.length} opportunities available</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <BriefcaseIcon className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">{myJobs.length} Applied</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            placeholder="Search jobs, locations, companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#0a1628] border border-white/[0.05] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Jobs', count: jobs.length },
            { id: 'available', label: 'Available', count: jobs.filter(j => !myJobs.includes(j.id)).length },
            { id: 'applied', label: 'Applied', count: myJobs.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white hover:border-white/10'
              )}
            >
              {tab.label}
              <span className={clsx(
                'px-1.5 py-0.5 rounded-md text-xs',
                filter === tab.id ? 'bg-white/20' : 'bg-white/5'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-[#0a1628] animate-pulse" />
            ))}
          </div>
        ) : paginatedJobs.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]">
            <BriefcaseIcon className="h-16 w-16 mx-auto mb-4 text-white/10" />
            <h3 className="text-white font-semibold mb-2">No jobs found</h3>
            <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedJobs.map(job => (
                <JobCard key={job.id} job={job} applied={myJobs.includes(job.id)} />
              ))}
            </div>
            
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
