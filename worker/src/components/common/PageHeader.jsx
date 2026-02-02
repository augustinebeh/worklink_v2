import { clsx } from 'clsx';

/**
 * Shared Page Header Component
 * Consistent header styling across pages
 */
export default function PageHeader({
  title,
  emoji,
  subtitle,
  rightAction,
  compact = false
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between',
      compact ? 'mb-3' : 'mb-4'
    )}>
      <div>
        <h1 className={clsx(
          'font-bold text-white flex items-center gap-2',
          compact ? 'text-xl' : 'text-2xl'
        )}>
          {title}
          {emoji && <span className={compact ? 'text-xl' : 'text-2xl'}>{emoji}</span>}
        </h1>
        {subtitle && (
          <p className="text-white/40 text-sm">{subtitle}</p>
        )}
      </div>
      {rightAction && (
        <div>{rightAction}</div>
      )}
    </div>
  );
}
