import { forwardRef } from 'react';
import { clsx } from 'clsx';

const Slider = forwardRef(({
  label,
  description,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  disabled,
  showValue = true,
  valueFormatter,
  className,
  containerClassName,
  error,
  ...props
}, ref) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const formatValue = (val) => {
    if (valueFormatter) return valueFormatter(val);
    return val.toString();
  };

  return (
    <div className={containerClassName}>
      {(label || description) && (
        <div className="mb-3">
          {label && (
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {label}
              </label>
              {showValue && (
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatValue(value)}
                </span>
              )}
            </div>
          )}
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="relative">
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          disabled={disabled}
          className={clsx(
            'w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer',
            'focus:outline-none focus:ring-4 focus:ring-primary-500/20',
            'slider-thumb:appearance-none slider-thumb:h-5 slider-thumb:w-5 slider-thumb:rounded-full',
            'slider-thumb:bg-primary-600 slider-thumb:border-2 slider-thumb:border-white',
            'slider-thumb:shadow-md slider-thumb:cursor-pointer',
            'slider-thumb:hover:shadow-lg slider-thumb:transition-shadow',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'ring-2 ring-red-500',
            className
          )}
          style={{
            background: disabled
              ? undefined
              : `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${percentage}%, rgb(203 213 225) ${percentage}%, rgb(203 213 225) 100%)`
          }}
          {...props}
        />

        {/* Value indicators */}
        <div className="flex justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Slider.displayName = 'Slider';

export default Slider;