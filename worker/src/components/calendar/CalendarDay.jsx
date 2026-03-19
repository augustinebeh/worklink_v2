import { clsx } from 'clsx';

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

export default function CalendarDay({
  day,
  status,
  jobCount,
  isToday,
  isSelected,
  isPast,
  hasPending,
  editMode,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPast && editMode}
      className={clsx(
        'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border',
        isSelected && !editMode ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30' :
        isToday ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
        isPast ? 'text-white/20 border-transparent' :
        statusStyles[status],
        hasPending && 'ring-2 ring-amber-400',
        !isPast && !isSelected && status === 'available' && 'hover:border-emerald-500/50'
      )}
    >
      <span className={clsx('text-sm font-medium', isPast && 'text-white/20')}>{day}</span>

      {/* Job count badge */}
      {jobCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center">
          {jobCount}
        </span>
      )}

      {/* Status dot */}
      {!isSelected && !isPast && status !== 'booked' && (
        <span className={clsx('absolute bottom-1 w-1.5 h-1.5 rounded-full', dotColors[status])} />
      )}
    </button>
  );
}
