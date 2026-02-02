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
  DollarSignIcon,
  ShareIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
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
  const toast = useToast();
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
        body: JSON.stringify({ job_id: id, candidate_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setHasApplied(true);
        toast.success('Applied!', 'Your application has been submitted');
      } else {
        toast.error('Failed', data.error || 'Could not apply');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    if (!job) return;

    const jobUrl = `${window.location.origin}/jobs/${id}`;
    const shareText = `Check out this job: ${job.title} - $${formatMoney(job.pay_rate)}/hr at ${job.location}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: job.title,
          text: shareText,
          url: jobUrl,
        });
        toast.success('Shared!', 'Job link shared successfully');
      } else {
        await navigator.clipboard.writeText(jobUrl);
        toast.success('Copied!', 'Job link copied to clipboard');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        await navigator.clipboard.writeText(jobUrl);
        toast.success('Copied!', 'Job link copied to clipboard');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-theme-primary flex flex-col items-center justify-center p-4">
        <AlertCircleIcon className="h-16 w-16 text-red-500/50 mb-4" />
        <p className="text-white text-lg font-semibold">Job not found</p>
        <button onClick={() => navigate('/jobs')} className="mt-4 text-emerald-400">Back to Jobs</button>
      </div>
    );
  }

  const startTime = job.start_time || DEFAULT_START_TIME;
  const endTime = job.end_time || DEFAULT_END_TIME;
  const hours = calculateJobHours(startTime, endTime, job.break_minutes);
  const totalPay = hours * job.pay_rate;
  const jobDate = new Date(job.job_date);
  const slotsLeft = job.total_slots - job.filled_slots;

  return (
    <div className="min-h-screen bg-theme-primary pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-theme-primary/95 backdrop-blur-xl px-4 pt-4 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back</span>
          </button>
          <button onClick={handleShare} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ShareIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Hero Card */}
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          {job.featured === 1 && (
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4" />
          )}
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />
          
          <div className="relative p-6">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              {job.featured === 1 && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium">
                  <ZapIcon className="h-4 w-4" /> Hot
                </span>
              )}
              {hasApplied && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                  <CheckCircleIcon className="h-4 w-4" /> Applied
                </span>
              )}
              {slotsLeft <= 3 && (
                <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium">
                  {slotsLeft} slots left
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">{job.title}</h1>
            <p className="flex items-center gap-2 text-white/50">
              <BuildingIcon className="h-4 w-4" />
              {job.company_name || 'WorkLink Client'}
            </p>

            {/* Pay Highlight */}
            <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-sm">Total Earnings</p>
                  <p className="text-3xl font-bold text-emerald-400">${formatMoney(totalPay)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-sm">Rate</p>
                  <p className="text-lg font-semibold text-white">${formatMoney(job.pay_rate)}/hr</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">Date</span>
            </div>
            <p className="text-white font-medium">
              {jobDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: TIMEZONE })}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <ClockIcon className="h-4 w-4" />
              <span className="text-sm">Time</span>
            </div>
            <p className="text-white font-medium">{startTime} - {endTime}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <MapPinIcon className="h-4 w-4" />
              <span className="text-sm">Location</span>
            </div>
            <p className="text-white font-medium truncate">{job.location}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <UsersIcon className="h-4 w-4" />
              <span className="text-sm">Slots</span>
            </div>
            <p className="text-white font-medium">{slotsLeft} / {job.total_slots} available</p>
          </div>
        </div>

        {/* XP Bonus */}
        {job.xp_bonus > 0 && (
          <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center">
              <ZapIcon className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-semibold">XP Bonus</p>
              <p className="text-violet-400">+{job.xp_bonus} XP for completing this job</p>
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Job Description</h2>
            <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
              <p className="text-white/70 whitespace-pre-line">{job.description}</p>
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Requirements</h2>
            <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
              <p className="text-white/70 whitespace-pre-line">{job.requirements}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Apply Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-theme-primary/95 backdrop-blur-xl border-t border-white/[0.05]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-white/50 text-sm">Total Pay</p>
            <p className="text-2xl font-bold text-emerald-400">${formatMoney(totalPay)}</p>
          </div>
          {hasApplied ? (
            <button
              disabled
              className="px-8 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-2"
            >
              <CheckCircleIcon className="h-5 w-5" />
              Applied
            </button>
          ) : slotsLeft === 0 ? (
            <button
              disabled
              className="px-8 py-4 rounded-2xl bg-white/5 text-white/30 font-semibold"
            >
              Fully Booked
            </button>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform disabled:opacity-50"
            >
              {applying ? 'Applying...' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
