import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
  BriefcaseIcon,
  DollarSignIcon,
  ClockIcon as PendingIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE, getSGDateString, formatMoney } from '../utils/constants';
import { EmptyState } from '../components/common';
import { useMyDeployments, useAvailability, useAvailabilityMode, useSaveAvailability } from '../hooks/useQueries';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Check if a day is a weekday (Mon-Fri)
function isWeekday(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return d >= 1 && d <= 5;
}

// Check if a day is a weekend (Sat-Sun)
function isWeekend(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

// Pending Account Overlay
function PendingAccountOverlay() {
  const { logout } = useAuth();

  // Lock body scroll when overlay is shown
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-theme-primary/80 backdrop-blur-md"
      style={{ position: 'fixed', height: '100dvh', width: '100vw' }}
    >
      {/* Centered Frame - does not scroll */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm p-5 sm:p-6 rounded-3xl bg-[#0a1628] border border-amber-500/30 shadow-2xl">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <PendingIcon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Account Pending Approval</h2>
            <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-4">
              Your account is being reviewed. Once approved, you'll be able to view your calendar and schedule.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <CheckCircleIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span className="text-white/70">Account created successfully</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin flex-shrink-0" />
                <span className="text-amber-400">Awaiting admin approval</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                <span className="text-white/40">View calendar & availability</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
          <p className="text-[10px] sm:text-xs text-white/40 mb-3 sm:mb-4">
            This usually takes 1-2 business days. You'll receive a notification when your account is approved.
          </p>

          {/* Navigation Options */}
          <div className="flex gap-2">
            <Link
              to="/profile"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              View Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  const { user } = useAuth();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mode, setMode] = useState('view');
  const [pendingChanges, setPendingChanges] = useState({});

  // Check if user is pending
  const isPending = user?.status === 'pending' || user?.status === 'lead';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // React Query — cached, deduped, auto-refetching
  const { data: deployments = [], isLoading: deploymentsLoading } = useMyDeployments(user?.id);
  const { data: availability = [], isLoading: availabilityLoading } = useAvailability(user?.id);
  const { data: modeData, isLoading: modeLoading } = useAvailabilityMode(user?.id);
  const saveAvailability = useSaveAvailability(user?.id);

  const loading = deploymentsLoading || availabilityLoading || modeLoading;
  const saving = saveAvailability.isPending;

  const availabilityMode = modeData?.mode || 'weekdays';
  const customDays = modeData?.customDays || [];

  const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getDateString = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Get deployments for a specific date
  const getDeploymentsForDate = (dateStr) => {
    return deployments.filter(d => {
      const jobDate = d.job_date?.split('T')[0];
      return jobDate === dateStr;
    });
  };

  // Determine if a date is available based on mode
  const isDateAvailable = (day) => {
    const dateStr = getDateString(day);
    
    // Check custom overrides first
    const customOverride = availability.find(a => a.date === dateStr);
    if (customOverride) {
      return customOverride.status === 'available';
    }
    
    // Check pending changes
    if (pendingChanges[dateStr] !== undefined) {
      return pendingChanges[dateStr] === 'available';
    }
    
    // Check based on mode
    switch (availabilityMode) {
      case 'weekdays':
        return isWeekday(year, month, day);
      case 'weekends':
        return isWeekend(year, month, day);
      case 'all':
        return true;
      case 'custom':
        const dayOfWeek = new Date(year, month, day).getDay();
        return customDays.includes(dayOfWeek);
      default:
        return false;
    }
  };

  const getAvailabilityForDate = (dateStr) => {
    if (pendingChanges[dateStr] !== undefined) return pendingChanges[dateStr];
    const custom = availability.find(a => a.date === dateStr);
    if (custom) return custom.status;
    return null; // No custom override, use mode-based
  };

  const selectedDateStr = getSGDateString(selectedDate);
  const selectedDeployments = getDeploymentsForDate(selectedDateStr);
  const hasJobs = (day) => getDeploymentsForDate(getDateString(day)).length > 0;
  const getJobCount = (day) => getDeploymentsForDate(getDateString(day)).length;
  const isToday = (day) => getDateString(day) === getSGDateString();
  const isSelected = (day) => day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  const isPast = (day) => getDateString(day) < getSGDateString();

  const handleDayClick = (day) => {
    const dateStr = getDateString(day);
    if (mode === 'edit' && !isPast(day)) {
      const isCurrentlyAvailable = isDateAvailable(day);
      const newStatus = isCurrentlyAvailable ? 'unavailable' : 'available';
      setPendingChanges({ ...pendingChanges, [dateStr]: newStatus });
    } else {
      setSelectedDate(new Date(year, month, day));
    }
  };

  const handleSaveAvailability = async () => {
    const dates = Object.entries(pendingChanges).map(([date, status]) => ({ date, status }));
    if (dates.length === 0) { setMode('view'); return; }
    saveAvailability.mutate(dates, {
      onSuccess: () => {
        toast.success('Saved!', 'Availability updated');
        setPendingChanges({});
        setMode('view');
      },
      onError: () => {
        toast.error('Failed', 'Could not save');
      },
    });
  };

  const handleSetAvailability = async (status) => {
    saveAvailability.mutate([{ date: selectedDateStr, status }], {
      onSuccess: () => {
        toast.success('Updated', `Marked as ${status}`);
      },
      onError: () => {
        toast.error('Failed', 'Could not update');
      },
    });
  };

  const getDayStatus = (day) => {
    if (hasJobs(day)) return 'booked';
    if (isDateAvailable(day)) return 'available';
    return 'unavailable';
  };

  // Calculate monthly stats
  const monthlyDeployments = deployments.filter(d => {
    const jobDate = new Date(d.job_date);
    return jobDate.getMonth() === month && jobDate.getFullYear() === year;
  });
  const monthlyEarnings = monthlyDeployments.reduce((sum, d) => sum + (d.total_pay || 0), 0);

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Pending Account Overlay */}
      {isPending && <PendingAccountOverlay />}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-theme-primary/95 backdrop-blur-xl px-4 pt-4 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-emerald-400" />
            Calendar
          </h1>
          <div className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <button
                  onClick={() => { setPendingChanges({}); setMode('view'); }}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAvailability}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save (${Object.keys(pendingChanges).length})`}
                </button>
              </>
            ) : (
              <>
                <button onClick={goToToday} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium">
                  Today
                </button>
                <button onClick={() => setMode('edit')} className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Month Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 text-violet-400 mb-1">
              <BriefcaseIcon className="h-4 w-4" />
              <span className="text-xs">Jobs This Month</span>
            </div>
            <p className="text-2xl font-bold text-white">{monthlyDeployments.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <DollarSignIcon className="h-4 w-4" />
              <span className="text-xs">Expected Earnings</span>
            </div>
            <p className="text-2xl font-bold text-white">${formatMoney(monthlyEarnings)}</p>
          </div>
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-4 mb-4 text-xs text-white/50">
            <span>Tap dates to toggle:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Unavailable</span>
          </div>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 rounded-xl hover:bg-white/5">
            <ChevronLeftIcon className="h-5 w-5 text-white/50" />
          </button>
          <h2 className="text-lg font-semibold text-white">{MONTHS[month]} {year}</h2>
          <button onClick={goToNextMonth} className="p-2 rounded-xl hover:bg-white/5">
            <ChevronRightIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium py-2 text-white/40">{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const status = getDayStatus(day);
            const hasPending = pendingChanges[getDateString(day)] !== undefined;
            const jobCount = getJobCount(day);
            
            const statusStyles = {
              available: 'bg-emerald-500/10 border-emerald-500/30',
              unavailable: 'bg-white/[0.02] border-white/[0.03]',
              booked: 'bg-violet-500/20 border-violet-500/40',
            };
            
            const dotColors = {
              available: 'bg-emerald-400',
              unavailable: 'bg-white/20',
              booked: 'bg-violet-400',
            };

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={isPast(day) && mode === 'edit'}
                className={clsx(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border',
                  isSelected(day) && mode !== 'edit' ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30' :
                  isToday(day) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                  isPast(day) ? 'text-white/20 border-transparent' :
                  statusStyles[status],
                  hasPending && 'ring-2 ring-amber-400',
                  !isPast(day) && !isSelected(day) && status === 'available' && 'hover:border-emerald-500/50'
                )}
              >
                <span className={clsx('text-sm font-medium', isPast(day) && 'text-white/20')}>{day}</span>
                
                {/* Job count badge */}
                {jobCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {jobCount}
                  </span>
                )}
                
                {/* Status dot */}
                {!isSelected(day) && !isPast(day) && status !== 'booked' && (
                  <span className={clsx('absolute bottom-1 w-1.5 h-1.5 rounded-full', dotColors[status])} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/40">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Available</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-violet-500 text-[8px] font-bold text-white flex items-center justify-center">1</span>
            Scheduled Jobs
          </span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20" /> Unavailable</span>
        </div>

        {/* Selected Date Details */}
        {mode !== 'edit' && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              {selectedDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIMEZONE })}
            </h3>

            {/* Quick availability toggle */}
            {!isPast(selectedDate.getDate()) && selectedDeployments.length === 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-white/40">Set as:</span>
                <button
                  onClick={() => handleSetAvailability('available')}
                  className={clsx(
                    'flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    isDateAvailable(selectedDate.getDate())
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  )}
                >
                  <CheckIcon className="h-4 w-4" /> Available
                </button>
                <button
                  onClick={() => handleSetAvailability('unavailable')}
                  className={clsx(
                    'flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    !isDateAvailable(selectedDate.getDate())
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/20 border border-red-500/30 text-red-400'
                  )}
                >
                  <XIcon className="h-4 w-4" /> Unavailable
                </button>
              </div>
            )}

            {/* Jobs for selected date */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            ) : selectedDeployments.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No jobs scheduled"
                description={isDateAvailable(selectedDate.getDate()) ? "You're available this day" : undefined}
                compact
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-white/50 mb-2">{selectedDeployments.length} job{selectedDeployments.length !== 1 ? 's' : ''} scheduled</p>
                {selectedDeployments.map(deployment => (
                  <Link
                    key={deployment.id}
                    to={`/jobs/${deployment.job_id}`}
                    className="block p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 hover:border-violet-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <BriefcaseIcon className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{deployment.job_title}</h4>
                          <p className="text-sm text-white/40">{deployment.company_name || 'Client'}</p>
                        </div>
                      </div>
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        deployment.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        deployment.status === 'confirmed' ? 'bg-violet-500/20 text-violet-400' :
                        'bg-amber-500/20 text-amber-400'
                      )}>
                        {deployment.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" /> 
                        {deployment.start_time || '09:00'} - {deployment.end_time || '17:00'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" /> 
                        {deployment.location}
                      </span>
                    </div>
                    {deployment.total_pay && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <span className="text-emerald-400 font-semibold">${formatMoney(deployment.total_pay)}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
