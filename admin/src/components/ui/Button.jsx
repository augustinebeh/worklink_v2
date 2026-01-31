import { forwardRef } from 'react';
import { clsx } from 'clsx';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  success: 'btn-success',
  danger: 'btn-danger',
};

const sizes = {
  sm: 'btn-sm min-h-[36px]',
  md: 'min-h-[44px]',
  lg: 'btn-lg min-h-[52px]',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon: Icon,
  iconPosition = 'left',
  className,
  disabled,
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  // Icon-only button detection
  const isIconOnly = Icon && !children;

  return (
    <button
      ref={ref}
      className={clsx(
        'btn',
        variants[variant],
        sizes[size],
        loading && 'opacity-70 cursor-wait',
        isIconOnly && 'px-2.5',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      aria-label={ariaLabel || (isIconOnly && props.title) || undefined}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{loadingText || 'Loading...'}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="h-4 w-4" aria-hidden="true" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="h-4 w-4" aria-hidden="true" />}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
