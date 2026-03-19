import { clsx } from 'clsx';
import CalendarDay from './CalendarDay';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({
  year,
  month,
  daysInMonth,
  firstDay,
  mode,
  pendingChanges,
  getDateString,
  getDayStatus,
  getJobCount,
  isToday,
  isSelected,
  isPast,
  onDayClick,
}) {
  return (
    <>
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
          return (
            <CalendarDay
              key={day}
              day={day}
              status={getDayStatus(day)}
              jobCount={getJobCount(day)}
              isToday={isToday(day)}
              isSelected={isSelected(day)}
              isPast={isPast(day)}
              hasPending={pendingChanges[getDateString(day)] !== undefined}
              editMode={mode === 'edit'}
              onClick={() => onDayClick(day)}
            />
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
    </>
  );
}
