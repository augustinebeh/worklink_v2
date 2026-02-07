import { ChevronRightIcon } from 'lucide-react';
import { clsx } from 'clsx';

export default function MenuLink({ icon: Icon, label, sublabel, onClick, danger, badge }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-4 p-4 rounded-2xl transition-all',
        danger
          ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'
          : 'bg-theme-card/80 border border-white/[0.05] hover:border-white/10'
      )}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', danger ? 'bg-red-500/20' : 'bg-white/5')}>
        <Icon className={clsx('h-5 w-5', danger ? 'text-red-400' : 'text-white/70')} />
      </div>
      <div className="flex-1 text-left">
        <span className={danger ? 'text-red-400' : 'text-white'}>{label}</span>
        {sublabel && <p className="text-xs text-white/40">{sublabel}</p>}
      </div>
      {badge ? (
        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">{badge}</span>
      ) : (
        <ChevronRightIcon className={clsx('h-5 w-5', danger ? 'text-red-400/50' : 'text-white/30')} />
      )}
    </button>
  );
}
