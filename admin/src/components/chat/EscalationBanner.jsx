import { useState } from 'react';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';

// Status/Priority dropdown component
export function StatusPriorityDropdown({ type, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const options = type === 'status'
    ? [
        { value: 'open', label: 'Open', icon: MessageSquare, color: 'text-blue-500' },
        { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-500' },
        { value: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-500' },
      ]
    : [
        { value: 'urgent', label: 'Urgent', color: 'text-red-500', dot: 'bg-red-500' },
        { value: 'high', label: 'High', color: 'text-orange-500', dot: 'bg-orange-500' },
        { value: 'normal', label: 'Normal', color: 'text-slate-500', dot: 'bg-slate-400' },
      ];

  const currentOption = options.find(o => o.value === value) || options[options.length - 1];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
      >
        {type === 'status' && currentOption.icon && (
          <currentOption.icon className={clsx('h-4 w-4', currentOption.color)} />
        )}
        {type === 'priority' && (
          <span className={clsx('w-2.5 h-2.5 rounded-full', currentOption.dot)} />
        )}
        <span className={currentOption.color}>{currentOption.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px]">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                  value === option.value && 'bg-slate-50 dark:bg-slate-700/50'
                )}
              >
                {type === 'status' && option.icon && (
                  <option.icon className={clsx('h-4 w-4', option.color)} />
                )}
                {type === 'priority' && (
                  <span className={clsx('w-2.5 h-2.5 rounded-full', option.dot)} />
                )}
                <span className={option.color}>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
