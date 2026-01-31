import { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { EyeIcon, EyeOffIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';

const Input = forwardRef(({
  label,
  error,
  success,
  hint,
  icon: Icon,
  iconPosition = 'left',
  className,
  containerClassName,
  required,
  type = 'text',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const hasValidation = error || success;
  const ValidationIcon = error ? AlertCircleIcon : success ? CheckCircleIcon : null;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          className={clsx(
            'input min-h-[44px]',
            error && 'input-error border-red-500 focus:border-red-500 focus:ring-red-500/20',
            success && 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20',
            Icon && iconPosition === 'left' && 'pl-10',
            (Icon && iconPosition === 'right') || isPassword || hasValidation ? 'pr-10' : '',
            className
          )}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${props.id || props.name}-error` : hint ? `${props.id || props.name}-hint` : undefined}
          {...props}
        />

        {/* Right side icons */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4 text-slate-400" />
              ) : (
                <EyeIcon className="h-4 w-4 text-slate-400" />
              )}
            </button>
          )}
          {ValidationIcon && !isPassword && (
            <ValidationIcon
              className={clsx(
                'h-4 w-4',
                error ? 'text-red-500' : 'text-emerald-500'
              )}
              aria-hidden="true"
            />
          )}
          {Icon && iconPosition === 'right' && !isPassword && !hasValidation && (
            <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          )}
        </div>
      </div>
      {error && (
        <p id={`${props.id || props.name}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircleIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {success && !error && (
        <p className="mt-1.5 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {success}
        </p>
      )}
      {hint && !error && !success && (
        <p id={`${props.id || props.name}-hint`} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

// Textarea variant
export const Textarea = forwardRef(({
  label,
  error,
  success,
  hint,
  className,
  containerClassName,
  rows = 4,
  required,
  maxLength,
  value,
  ...props
}, ref) => {
  const charCount = value?.length || 0;
  const showCharCount = maxLength && charCount > 0;

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        maxLength={maxLength}
        className={clsx(
          'input resize-none',
          error && 'input-error border-red-500',
          success && 'border-emerald-500',
          className
        )}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      <div className="flex justify-between mt-1.5">
        <div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {success && !error && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          )}
          {hint && !error && !success && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
          )}
        </div>
        {showCharCount && (
          <p className={clsx(
            'text-sm',
            charCount >= maxLength ? 'text-red-500' : 'text-slate-400'
          )}>
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';
