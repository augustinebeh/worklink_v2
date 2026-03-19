import { clsx } from 'clsx';

const variants = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  destructive: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
};

export function Alert({ children, variant = 'default', className, ...props }) {
  return (
    <div
      role="alert"
      className={clsx('relative w-full rounded-lg border p-4', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children, className, ...props }) {
  return (
    <div className={clsx('text-sm', className)} {...props}>
      {children}
    </div>
  );
}

export default Alert;
