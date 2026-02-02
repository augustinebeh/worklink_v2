import { clsx } from 'clsx';

/**
 * SectionHeader - Consistent section header styling
 * Used for section titles within pages (e.g., "Contact Info", "How It Works")
 *
 * Pattern: [Icon] Title                    [Action Button/Link]
 */
export default function SectionHeader({
  title,
  icon: Icon,
  iconColor = 'text-emerald-400',
  action,
  actionLabel,
  onAction,
  actionVariant = 'link', // 'link' | 'button'
  className = '',
}) {
  return (
    <div className={clsx('flex items-center justify-between mb-3', className)}>
      <h2 className="text-white font-semibold flex items-center gap-2">
        {Icon && <Icon className={clsx('h-5 w-5', iconColor)} />}
        {title}
      </h2>
      {(action || actionLabel) && (
        actionVariant === 'link' ? (
          <button
            onClick={onAction}
            className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
          >
            {actionLabel || action}
          </button>
        ) : (
          <button
            onClick={onAction}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
          >
            {actionLabel || action}
          </button>
        )
      )}
    </div>
  );
}
