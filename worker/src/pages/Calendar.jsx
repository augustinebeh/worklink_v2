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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE, getSGDateString } from '../utils/constants';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deployments, setDeployments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view');
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

  const getDateString = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const getDeploymentsForDate = (date) => deployments.filter(d => d.job_date === getSGDateString(date));
  const getAvailabilityForDate = (dateStr) => {
    if (pendingChanges[dateStr] !== undefined) return pendingChanges[dateStr];
    return availability.find(a => a.date === dateStr)?.status || 'unset';
  };

  const selectedDeployments = getDeploymentsForDate(selectedDate);
  const selectedDateStr = getSGDateString(selectedDate);
  const selectedAvailability = getAvailabilityForDate(selectedDateStr);
  const hasJobs = (day) => getDeploymentsForDate(new Date(year, month, day)).length > 0;
  const isToday = (day) => getDateString(day) === getSGDateString();
  const isSelected = (day) => day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  const isPast = (day) => getDateString(day) < getSGDateString();

  const handleDayClick = (day) => {
    const dateStr = getDateString(day);
    if (mode === 'edit' && !isPast(day)) {
      const currentStatus = getAvailabilityForDate(dateStr);
      const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
      setPendingChanges({ ...pendingChanges, [dateStr]: newStatus });
    } else {
      setSelectedDate(new Date(year, month, day));
    }
  };

  const handleSaveAvailability = async () => {
    const dates = Object.entries(pendingChanges).map(([date, status]) => ({ date, status }));
    if (dates.length === 0) { setMode('view'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/availability/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates }),
      });
      if ((await res.json()).success) {
        setPendingChanges({});
        setMode('view');
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSetAvailability = async (status) => {
    try {
      await fetch(`/api/v1/availability/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: [{ date: selectedDateStr, status }] }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to set availability:', error);
    }
  };

  const getDayStatus = (day) => {
    if (hasJobs(day)) return 'booked';
    return getAvailabilityForDate(getDateString(day));
  };

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#020817]/95 backdrop-blur-xl px-4 pt-4 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
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
            
            const statusStyles = {
              available: 'bg-emerald-500/20 border-emerald-500/40',
              unavailable: 'bg-red-500/20 border-red-500/40',
              booked: 'bg-violet-500/20 border-violet-500/40',
              unset: 'border-white/[0.05]',
            };
            
            const dotColors = {
              available: 'bg-emerald-400',
              unavailable: 'bg-red-400',
              booked: 'bg-violet-400',
            };

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={isPast(day) && mode === 'edit'}
                className={clsx(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border',
                  isSelected(day) && mode !== 'edit' ? 'bg-emerald-500 text-white border-emerald-400' :
                  isToday(day) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                  isPast(day) ? 'text-white/20 border-transparent' :
                  statusStyles[status],
                  hasPending && 'ring-2 ring-amber-400'
                )}
              >
                <span className="text-sm font-medium">{day}</span>
                {status !== 'unset' && !isSelected(day) && (
                  <span className={clsx('absolute bottom-1 w-1.5 h-1.5 rounded-full', dotColors[status])} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/40">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> Booked</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Unavailable</span>
        </div>

        {/* Selected Date Details */}
        {mode !== 'edit' && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              {selectedDate.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIMEZONE })}
            </h3>

            {!isPast(selectedDate.getDate()) && selectedDeployments.length === 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-white/40">Set as:</span>
                <button
                  onClick={() => handleSetAvailability('available')}
                  className={clsx(
                    'flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    selectedAvailability === 'available'
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
                    selectedAvailability === 'unavailable'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/20 border border-red-500/30 text-red-400'
                  )}
                >
                  <XIcon className="h-4 w-4" /> Unavailable
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            ) : selectedDeployments.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-white/10" />
                <p className="text-white/40">No jobs scheduled</p>
                {selectedAvailability === 'available' && <p className="text-sm text-emerald-400 mt-1">You're marked as available</p>}
                {selectedAvailability === 'unavailable' && <p className="text-sm text-red-400 mt-1">You're marked as unavailable</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDeployments.map(deployment => (
                  <Link
                    key={deployment.id}
                    to={`/jobs/${deployment.job_id}`}
                    className="block p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05] hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{deployment.job_title}</h4>
                        <p className="text-sm text-white/40">{deployment.company_name || deployment.location}</p>
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
                    <div className="flex items-center gap-4 mt-3 text-sm text-white/40">
                      <span className="flex items-center gap-1"><ClockIcon className="h-4 w-4" /> {deployment.start_time || '09:00'} - {deployment.end_time || '17:00'}</span>
                      <span className="flex items-center gap-1"><MapPinIcon className="h-4 w-4" /> {deployment.location}</span>
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
