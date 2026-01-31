import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPinIcon, 
  ClockIcon, 
  CalendarIcon,
  DollarSignIcon,
  ZapIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  UsersIcon,
  BuildingIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4">
        <AlertCircleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-white text-lg">Job not found</p>
        <button onClick={() => navigate('/jobs')} className="mt-4 text-primary-400">Back to Jobs</button>
      </div>
    );
  }

  // Calculate hours and pay
  const start = (job.start_time || '09:00').split(':').map(Number);
  let end = (job.end_time || '17:00').split(':').map(Number);
  if (end[0] < start[0]) end[0] += 24;
  const hours = ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - (job.break_minutes || 0)) / 60;
  const totalPay = hours * job.pay_rate;

  const jobDate = new Date(job.job_date);
  const slotsLeft = job.total_slots - job.filled_slots;

  return (
    <div className="min-h-screen bg-dark-950 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur-lg px-4 pt-safe pb-4 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-white">
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
          <h1 className="text-2xl font-bold text-white">{job.title}</h1>
          <p className="text-dark-400 mt-1 flex items-center gap-2">
            <BuildingIcon className="h-4 w-4" />
            {job.company_name || 'TalentVis Client'}
          </p>
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <CalendarIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className="text-xs text-dark-500">Date</p>
            <p className="text-white font-medium">{jobDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <ClockIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className="text-xs text-dark-500">Time</p>
            <p className="text-white font-medium">{job.start_time} - {job.end_time}</p>
            <p className="text-xs text-dark-500">{hours.toFixed(1)} hours</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <MapPinIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className="text-xs text-dark-500">Location</p>
            <p className="text-white font-medium">{job.location}</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <UsersIcon className="h-5 w-5 text-primary-400 mb-2" />
            <p className="text-xs text-dark-500">Slots</p>
            <p className="text-white font-medium">{slotsLeft} of {job.total_slots} left</p>
          </div>
        </div>

        {/* Pay section */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-accent-900/30 to-accent-800/10 border border-accent-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-accent-400 text-sm font-medium">Total Earnings</p>
              <p className="text-4xl font-bold text-white">${totalPay.toFixed(2)}</p>
              <p className="text-dark-400 text-sm">${Number(job.pay_rate).toFixed(2)}/hr × {hours.toFixed(1)} hours</p>
            </div>
            {job.xp_bonus > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary-400">
                  <ZapIcon className="h-5 w-5" />
                  <span className="text-xl font-bold">+{job.xp_bonus}</span>
                </div>
                <p className="text-xs text-dark-400">Bonus XP</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
            <p className="text-dark-300 leading-relaxed">{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.required_certifications && JSON.parse(job.required_certifications || '[]').length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Requirements</h2>
            <div className="flex flex-wrap gap-2">
              {JSON.parse(job.required_certifications).map((cert, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-dark-800 text-dark-300 text-sm">
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed apply button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-dark-950/95 backdrop-blur-lg border-t border-white/5">
        <button
          onClick={handleApply}
          disabled={hasApplied || applying || slotsLeft === 0}
          className={clsx(
            'w-full py-4 rounded-xl font-semibold text-lg transition-all',
            hasApplied 
              ? 'bg-accent-500/20 text-accent-400 cursor-default' 
              : slotsLeft === 0
                ? 'bg-dark-800 text-dark-500 cursor-not-allowed'
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
            `Apply for $${totalPay.toFixed(2)}`
          )}
        </button>
      </div>
    </div>
  );
}
