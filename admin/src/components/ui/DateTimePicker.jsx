import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import Input from './Input';

const DateTimePicker = forwardRef(({
  label,
  value,
  onChange,
  type = 'datetime-local',
  error,
  className,
  containerClassName,
  icon,
  ...props
}, ref) => {
  const defaultIcon = type === 'date' ? CalendarIcon : ClockIcon;
  const IconComponent = icon || defaultIcon;

  return (
    <Input
      ref={ref}
      type={type}
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      icon={IconComponent}
      className={clsx(
        'text-sm',
        className
      )}
      containerClassName={containerClassName}
      {...props}
    />
  );
});

DateTimePicker.displayName = 'DateTimePicker';

// Time picker specifically for time inputs
export const TimePicker = forwardRef(({
  label,
  value,
  onChange,
  error,
  className,
  containerClassName,
  ...props
}, ref) => {
  return (
    <DateTimePicker
      ref={ref}
      type="time"
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      icon={ClockIcon}
      className={className}
      containerClassName={containerClassName}
      {...props}
    />
  );
});

TimePicker.displayName = 'TimePicker';

export default DateTimePicker;