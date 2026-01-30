import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MapPinIcon, 
  ClockIcon,
  CalendarIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

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
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    if (user) fetchDeployments();
  }, [user, month, year]);

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}/deployments`);
      const data = await res.json();
      if (data.success) setDeployments(data.data);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Get deployments for a specific date
  const getDeploymentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return deployments.filter(d => d.job_date === dateStr);
  };

  // Get deployments for selected date
  const selectedDeployments = getDeploymentsForDate(selectedDate);

  // Check if date has jobs
  const hasJobs = (day) => {
    const date = new Date(year, month, day);
    return getDeploymentsForDate(date).length > 0;
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // Check if date is selected
  const isSelected = (day) => {
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  // Check if date is past
  const isPast = (day) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur-lg px-4 pt-safe pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <button 
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 text-sm font-medium"
          >
            Today
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-dark-800">
            <ChevronLeftIcon className="h-5 w-5 text-dark-400" />
          </button>
          <h2 className="text-lg font-semibold text-white">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-dark-800">
            <ChevronRightIcon className="h-5 w-5 text-dark-400" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-dark-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasJobsToday = hasJobs(day);
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={clsx(
                  'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all',
                  isSelected(day) 
                    ? 'bg-primary-500 text-white' 
                    : isToday(day)
                      ? 'bg-primary-500/20 text-primary-400'
                      : isPast(day)
                        ? 'text-dark-600'
                        : 'text-white hover:bg-dark-800'
                )}
              >
                <span className="text-sm font-medium">{day}</span>
                {hasJobsToday && (
                  <span className={clsx(
                    'absolute bottom-1 w-1.5 h-1.5 rounded-full',
                    isSelected(day) ? 'bg-white' : 'bg-accent-400'
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date jobs */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            {selectedDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : selectedDeployments.length === 0 ? (
            <div className="text-center py-8 text-dark-500">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No jobs scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDeployments.map(deployment => (
                <Link
                  key={deployment.id}
                  to={`/jobs/${deployment.job_id}`}
                  className="block p-4 rounded-xl bg-dark-800/50 border border-white/5 hover:border-primary-500/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white">{deployment.job_title}</h4>
                      <p className="text-sm text-dark-400">{deployment.company_name || deployment.location}</p>
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
                  <div className="flex items-center gap-4 mt-3 text-sm text-dark-400">
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
      </div>
    </div>
  );
}
