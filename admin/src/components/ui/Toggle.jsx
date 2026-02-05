import { forwardRef } from 'react';
import { clsx } from 'clsx';

const Toggle = forwardRef(({
  label,
  description,
  checked,
  onChange,
  disabled,
  size = 'md',
  className,
  containerClassName,
  error,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: {
      switch: 'h-4 w-7',
      thumb: 'h-3 w-3 translate-x-0.5 peer-checked:translate-x-3'
    },
    md: {
      switch: 'h-6 w-11',
      thumb: 'h-5 w-5 translate-x-0.5 peer-checked:translate-x-5'
    },
    lg: {
      switch: 'h-8 w-14',
      thumb: 'h-7 w-7 translate-x-0.5 peer-checked:translate-x-6'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={containerClassName}>
      <div className="flex items-start gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={clsx(
              'relative rounded-full transition-colors duration-200 ease-in-out peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20',
              currentSize.switch,
              checked
                ? 'bg-primary-600 peer-disabled:bg-primary-300'
                : 'bg-slate-200 dark:bg-slate-700 peer-disabled:bg-slate-100 dark:peer-disabled:bg-slate-800',
              error && 'ring-2 ring-red-500',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 left-0.5 bg-white dark:bg-slate-900 rounded-full transition-transform duration-200 ease-in-out shadow-sm',
                currentSize.thumb,
                disabled && 'bg-slate-50 dark:bg-slate-800'
              )}
            />
          </div>
        </label>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                {label}
              </div>
            )}
            {description && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Toggle.displayName = 'Toggle';

export default Toggle;