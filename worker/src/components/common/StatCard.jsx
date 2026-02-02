import { clsx } from 'clsx';

/**
 * Shared Stat Card/Pod Components
 * Used across: Profile, Wallet, Home, Calendar
 */
const colorClasses = {
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
};

/**
 * StatCard - Standard stat display with icon
 * Used in Profile page
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  color = 'emerald',
}) {
  const classes = colorClasses[color] || colorClasses.emerald;

  return (
    <div className={clsx(
      'p-4 rounded-2xl border bg-gradient-to-br',
      classes.split(' ').slice(0, 3).join(' ')
    )}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={clsx('h-4 w-4', classes.split(' ').slice(-1))} />}
        <span className="text-white/50 text-xs">{label}</span>
      </div>
      <p className={clsx('text-2xl font-bold', classes.split(' ').slice(-1))}>
        {value}
      </p>
    </div>
  );
}

/**
 * StatPod - Glass morphism variant with emoji or icon support
 * Used in Home and Wallet pages
 *
 * @param whiteValue - Use white text for value instead of color-matched
 * @param size - 'lg' (default) or 'md' for smaller text
 */
export function StatPod({
  label,
  value,
  emoji,
  icon: Icon,
  color = 'emerald',
  hidden = false,
  className,
  whiteValue = false,
  size = 'lg',
}) {
  const podColors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  };

  const classes = podColors[color] || podColors.emerald;
  const valueSize = size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={clsx(
      'relative rounded-2xl p-4 border backdrop-blur-sm bg-gradient-to-br',
      classes.split(' ').slice(0, 3).join(' '),
      className
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className={clsx('h-4 w-4', classes.split(' ').slice(-1))} />}
        <span className="text-white/50 text-xs">{label}</span>
        {emoji && <span>{emoji}</span>}
      </div>
      <p className={clsx(
        'font-bold',
        valueSize,
        whiteValue ? 'text-white' : classes.split(' ').slice(-1)
      )}>
        {hidden ? '••••' : value}
      </p>
    </div>
  );
}
