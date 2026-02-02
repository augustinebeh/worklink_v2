import { clsx } from 'clsx';

/**
 * Shared Empty State Component
 * Used when lists/data are empty
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false
}) {
  return (
    <div className={clsx(
      'text-center rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]',
      compact ? 'py-8 px-4' : 'py-16 px-6'
    )}>
      {Icon && (
        <Icon className={clsx(
          'mx-auto mb-4 text-white/10',
          compact ? 'h-12 w-12' : 'h-16 w-16'
        )} />
      )}
      <h3 className={clsx(
        'text-white font-semibold mb-2',
        compact ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h3>
      {description && (
        <p className={clsx(
          'text-white/40',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
