import { clsx } from 'clsx';

/**
 * Shared Filter Tabs Component
 * Used across: Wallet, Achievements, Jobs, Calendar, Quests, Notifications, etc.
 */
export default function FilterTabs({ tabs, activeFilter, onFilterChange, variant = 'default' }) {
  const variants = {
    default: {
      active: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25',
      inactive: 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white',
    },
    violet: {
      active: 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25',
      inactive: 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white',
    },
    cyan: {
      active: 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25',
      inactive: 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white',
    },
    pills: {
      active: 'bg-white text-slate-900',
      inactive: 'text-white/40 hover:text-white hover:bg-white/5',
    },
  };

  const style = variants[variant] || variants.default;

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={clsx(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
            activeFilter === tab.id ? style.active : style.inactive
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx(
              'ml-1.5 px-1.5 py-0.5 rounded-md text-xs',
              activeFilter === tab.id ? 'bg-white/20' : 'bg-white/10'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
