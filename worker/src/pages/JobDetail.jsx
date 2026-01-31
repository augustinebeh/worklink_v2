import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPinIcon,
  ClockIcon,
  CalendarIcon,
  ZapIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  UsersIcon,
  BuildingIcon,
  AlertCircleIcon,
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
} from '../utils/constants';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/v1/jobs/${id}`);
      const data = await res.json();
      if (data.success) {
        setJob(data.data);
        // Check if user has already applied
        if (user) {
          const deployRes = await fetch(`/api/v1/deployments?job_id=${id}&candidate_id=${user.id}`);
          const deployData = await deployRes.json();
          setHasApplied(deployData.data?.length > 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setApplying(true);
    try {
      const res = await fetch('/api/v1/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: id,
          candidate_id: user.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasApplied(true);
      }
    } catch (error) {
      console.error('Failed to apply:', error);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className={clsx('min-h-screen flex flex-col items-center justify-center p-4', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
        <AlertCircleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className={clsx('text-lg', isDark ? 'text-white' : 'text-slate-900')}>Job not found</p>
        <button onClick={() => navigate('/jobs')} className="mt-4 text-primary-400">Back to Jobs</button>
      </div>
    );
  }

  // Calculate hours and pay
  const hours = calculateJobHours(job.start_time, job.end_time, job.break_minutes);
  const totalPay = hours * job.pay_rate;

  const jobDate = new Date(job.job_date);
  const slotsLeft = job.total_slots - job.filled_slots;

  return (
    <div className={clsx('min-h-screen pb-32', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-lg px-4 pt-safe pb-4 border-b',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <button
          onClick={() => navigate(-1)}
          className={clsx('flex items-center gap-2', isDark ? 'text-dark-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back</span>
        </button>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Title section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {job.featured === 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
                <ZapIcon className="h-3 w-3" /> Featured
              </span>
            )}
            {hasApplied && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 text-xs font-medium">
                <CheckCircleIcon className="h-3 w-3" /> Applied
              </span>
            )}
          </div>
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{job.title}</h1>
          <p className={clsx('mt-1 flex items-center gap-2', isDark ? 'text-dark-400' : 'text-slate-500')}>
            <BuildingIcon className="h-4 w-4" />
            {job.company_name || 'TalentVis Client'}
          </p>
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={clsx(
            'p-4 rounded-xl border',
            isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          )}>
            <CalendarIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>Date</p>
            <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{jobDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIMEZONE })}</p>
          </div>
          <div className={clsx(
            'p-4 rounded-xl border',
            isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          )}>
            <ClockIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>Time</p>
            <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{job.start_time} - {job.end_time}</p>
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>{hours.toFixed(1)} hours</p>
          </div>
          <div className={clsx(
            'p-4 rounded-xl border',
            isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          )}>
            <MapPinIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>Location</p>
            <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{job.location}</p>
          </div>
          <div className={clsx(
            'p-4 rounded-xl border',
            isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          )}>
            <UsersIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>Slots</p>
            <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{slotsLeft} of {job.total_slots} left</p>
          </div>
        </div>

        {/* Pay section */}
        <div className={clsx(
          'p-6 rounded-2xl border',
          isDark
            ? 'bg-gradient-to-br from-accent-900/30 to-accent-800/10 border-accent-500/20'
            : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-accent-400 text-sm font-medium">Total Earnings</p>
              <p className={clsx('text-4xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>${formatMoney(totalPay)}</p>
              <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>${formatMoney(job.pay_rate)}/hr × {hours.toFixed(1)} hours</p>
            </div>
            {job.xp_bonus > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary-400">
                  <ZapIcon className="h-5 w-5" />
                  <span className="text-xl font-bold">+{job.xp_bonus}</span>
                </div>
                <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>Bonus XP</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <h2 className={clsx('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>Description</h2>
            <p className={clsx('leading-relaxed', isDark ? 'text-dark-300' : 'text-slate-600')}>{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.required_certifications && job.required_certifications.length > 0 && (
          <div>
            <h2 className={clsx('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>Requirements</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_certifications.map((cert, idx) => (
                <span
                  key={idx}
                  className={clsx(
                    'px-3 py-1 rounded-full text-sm',
                    isDark ? 'bg-dark-800 text-dark-300' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed apply button */}
      <div className={clsx(
        'fixed bottom-20 left-0 right-0 p-4 backdrop-blur-lg border-t',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <button
          onClick={handleApply}
          disabled={hasApplied || applying || slotsLeft === 0}
          className={clsx(
            'w-full py-4 rounded-xl font-semibold text-lg transition-all',
            hasApplied
              ? 'bg-accent-500/20 text-accent-400 cursor-default'
              : slotsLeft === 0
                ? isDark
                  ? 'bg-dark-800 text-dark-500 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]'
          )}
        >
          {applying ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Applying...</span>
            </div>
          ) : hasApplied ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Applied</span>
            </div>
          ) : slotsLeft === 0 ? (
            'No Slots Available'
          ) : (
            `Apply for $${formatMoney(totalPay)}`
          )}
        </button>
      </div>
    </div>
  );
}
