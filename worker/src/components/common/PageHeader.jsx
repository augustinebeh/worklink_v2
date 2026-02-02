import { clsx } from 'clsx';

/**
 * PageHeader - Main page title header
 * Used at the top of pages for the main title
 *
 * Pattern: [Icon] Title                    [Right Action]
 *          Subtitle
 */
export default function PageHeader({
  title,
  icon: Icon,
  iconColor = 'text-emerald-400',
  subtitle,
  rightAction,
  compact = false,
  className = '',
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between',
      compact ? 'mb-3' : 'mb-4',
      className
    )}>
      <div>
        <h1 className={clsx(
          'font-bold text-white flex items-center gap-2',
          compact ? 'text-xl' : 'text-2xl'
        )}>
          {Icon && <Icon className={clsx(compact ? 'h-5 w-5' : 'h-6 w-6', iconColor)} />}
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      {rightAction && (
        <div>{rightAction}</div>
      )}
    </div>
  );
}
