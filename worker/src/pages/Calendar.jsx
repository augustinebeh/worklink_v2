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
  AlertCircleIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE } from '../utils/constants';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deployments, setDeployments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    if (user) fetchData();
  }, [user, month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deploymentsRes, availabilityRes] = await Promise.all([
        fetch(`/api/v1/candidates/${user.id}/deployments`),
        fetch(`/api/v1/availability/${user.id}?days=60`),
      ]);

      const deploymentsData = await deploymentsRes.json();
      const availabilityData = await availabilityRes.json();

      if (deploymentsData.success) setDeployments(deploymentsData.data);
      if (availabilityData.success) setAvailability(availabilityData.data.availability || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getDateString = (day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDeploymentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return deployments.filter(d => d.job_date === dateStr);
  };

  const getAvailabilityForDate = (dateStr) => {
    // Check pending changes first
    if (pendingChanges[dateStr] !== undefined) {
      return pendingChanges[dateStr];
    }
    const avail = availability.find(a => a.date === dateStr);
    return avail?.status || 'unset';
  };

  const selectedDeployments = getDeploymentsForDate(selectedDate);
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedAvailability = getAvailabilityForDate(selectedDateStr);

  const hasJobs = (day) => {
    const date = new Date(year, month, day);
    return getDeploymentsForDate(date).length > 0;
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isSelected = (day) => {
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  const isPast = (day) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDayClick = (day) => {
    const dateStr = getDateString(day);
    if (mode === 'edit' && !isPast(day)) {
      // Toggle availability in edit mode
      const currentStatus = getAvailabilityForDate(dateStr);
      const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
      setPendingChanges({ ...pendingChanges, [dateStr]: newStatus });
    } else {
      setSelectedDate(new Date(year, month, day));
    }
  };

  const handleSaveAvailability = async () => {
    const dates = Object.entries(pendingChanges).map(([date, status]) => ({ date, status }));
    if (dates.length === 0) {
      setMode('view');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/availability/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingChanges({});
        setMode('view');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSetAvailability = async (status) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      await fetch(`/api/v1/availability/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: [{ date: dateStr, status }] }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to set availability:', error);
    }
  };

  const getDayStatus = (day) => {
    if (hasJobs(day)) return 'booked';
    const dateStr = getDateString(day);
    return getAvailabilityForDate(dateStr);
  };

  const statusColors = {
    available: 'bg-emerald-500/30 border-emerald-500/50',
    unavailable: 'bg-red-500/20 border-red-500/30',
    booked: 'bg-primary-500/30 border-primary-500/50',
    unset: '',
  };

  const statusDots = {
    available: 'bg-emerald-400',
    unavailable: 'bg-red-400',
    booked: 'bg-primary-400',
  };

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-lg px-4 pt-safe pb-4 border-b',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <div className="flex items-center justify-between mb-4">
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Calendar</h1>
          <div className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <button
                  onClick={() => { setPendingChanges({}); setMode('view'); }}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    isDark ? 'bg-dark-800 text-dark-400' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAvailability}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save (${Object.keys(pendingChanges).length})`}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={goToToday}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    isDark ? 'bg-dark-800 text-dark-300' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  Today
                </button>
                <button
                  onClick={() => setMode('edit')}
                  className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 text-sm font-medium"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode legend */}
        {mode === 'edit' && (
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Tap dates to toggle:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-emerald-400">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-red-400">Unavailable</span>
            </div>
          </div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className={clsx('p-2 rounded-lg', isDark ? 'hover:bg-dark-800' : 'hover:bg-slate-100')}>
            <ChevronLeftIcon className={clsx('h-5 w-5', isDark ? 'text-dark-400' : 'text-slate-500')} />
          </button>
          <h2 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={goToNextMonth} className={clsx('p-2 rounded-lg', isDark ? 'hover:bg-dark-800' : 'hover:bg-slate-100')}>
            <ChevronRightIcon className={clsx('h-5 w-5', isDark ? 'text-dark-400' : 'text-slate-500')} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(day => (
            <div key={day} className={clsx('text-center text-xs font-medium py-2', isDark ? 'text-dark-500' : 'text-slate-500')}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const status = getDayStatus(day);
            const dateStr = getDateString(day);
            const hasPendingChange = pendingChanges[dateStr] !== undefined;
            
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={isPast(day) && mode === 'edit'}
                className={clsx(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border',
                  isSelected(day) && mode !== 'edit'
                    ? 'bg-primary-500 text-white border-primary-400'
                    : isToday(day)
                      ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                      : isPast(day)
                        ? (isDark ? 'text-dark-600' : 'text-slate-300') + ' border-transparent'
                        : mode === 'edit' && status !== 'booked'
                          ? `cursor-pointer ${statusColors[status] || (isDark ? 'border-dark-700 hover:border-dark-600' : 'border-slate-200 hover:border-slate-300')}`
                          : `border-transparent ${statusColors[status]}`,
                  hasPendingChange && 'ring-2 ring-yellow-400'
                )}
              >
                <span className={clsx('text-sm font-medium', isPast(day) && mode !== 'edit' ? '' : '')}>{day}</span>
                {status !== 'unset' && !isSelected(day) && (
                  <span className={clsx(
                    'absolute bottom-1 w-1.5 h-1.5 rounded-full',
                    statusDots[status]
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-400" />
            <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Unavailable</span>
          </div>
        </div>

        {/* Selected date details */}
        {mode !== 'edit' && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                {selectedDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
            </div>

            {/* Quick availability buttons */}
            {!isPast(selectedDate.getDate()) && selectedDeployments.length === 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>Set as:</span>
                <button
                  onClick={() => handleSetAvailability('available')}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    selectedAvailability === 'available' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  )}
                >
                  <CheckIcon className="h-4 w-4" />
                  Available
                </button>
                <button
                  onClick={() => handleSetAvailability('unavailable')}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    selectedAvailability === 'unavailable' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  )}
                >
                  <XIcon className="h-4 w-4" />
                  Unavailable
                </button>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : selectedDeployments.length === 0 ? (
              <div className={clsx('text-center py-8', isDark ? 'text-dark-500' : 'text-slate-400')}>
                <CalendarIcon className={clsx('h-10 w-10 mx-auto mb-2', isDark ? 'opacity-50' : 'text-slate-300')} />
                <p>No jobs scheduled</p>
                {selectedAvailability === 'available' && (
                  <p className="text-sm text-emerald-400 mt-1">You're marked as available</p>
                )}
                {selectedAvailability === 'unavailable' && (
                  <p className="text-sm text-red-400 mt-1">You're marked as unavailable</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDeployments.map(deployment => (
                  <Link
                    key={deployment.id}
                    to={`/jobs/${deployment.job_id}`}
                    className={clsx(
                      'block p-4 rounded-xl border',
                      isDark ? 'bg-dark-800/50 border-white/5 hover:border-primary-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-primary-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{deployment.job_title}</h4>
                        <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>{deployment.company_name || deployment.location}</p>
                      </div>
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        deployment.status === 'completed' ? 'bg-accent-500/20 text-accent-400' :
                        deployment.status === 'confirmed' ? 'bg-primary-500/20 text-primary-400' :
                        'bg-amber-500/20 text-amber-400'
                      )}>
                        {deployment.status}
                      </span>
                    </div>
                    <div className={clsx('flex items-center gap-4 mt-3 text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{deployment.start_time || '09:00'} - {deployment.end_time || '17:00'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{deployment.location}</span>
                      </div>
                    </div>
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
