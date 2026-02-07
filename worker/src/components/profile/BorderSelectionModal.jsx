import { useState, useEffect } from 'react';
import { UserIcon, CheckIcon, XIcon, LockIcon } from 'lucide-react';
import { clsx } from 'clsx';

const RARITY_COLORS = {
  common: 'text-slate-400 bg-slate-500/20 border-slate-500/30',
  rare: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  epic: 'text-violet-400 bg-violet-500/20 border-violet-500/30',
  legendary: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
};

const TIER_COLORS = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-slate-300 to-slate-400',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-cyan-400 to-teal-500',
  diamond: 'from-violet-400 to-fuchsia-500',
  mythic: 'from-rose-400 to-pink-500',
  special: 'from-emerald-400 to-cyan-500',
};

export default function BorderSelectionModal({ isOpen, onClose, borders, selectedBorderId, onSelect, userLevel }) {
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = async (border) => {
    if (!border.unlocked || selecting) return;
    setSelecting(border.id);
    await onSelect(border.id);
    setSelecting(null);
  };

  const groupedBorders = borders.reduce((acc, border) => {
    if (!acc[border.tier]) acc[border.tier] = [];
    acc[border.tier].push(border);
    return acc;
  }, {});

  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'mythic', 'special'];

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[100] bg-black/70 backdrop-blur-sm"
      style={{ position: 'fixed', height: '100dvh', width: '100vw' }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[80vh] rounded-2xl bg-theme-card border border-white/10 overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-white">Select Profile Border</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            <XIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain">
          <div>
            <h4 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">Default</h4>
            <button
              onClick={() => onSelect(null)}
              className={clsx(
                'w-full flex items-center gap-4 p-3 rounded-xl border transition-all',
                !selectedBorderId
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-white/50" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">Level-Based Border</p>
                <p className="text-white/40 text-sm">Changes automatically with your level</p>
              </div>
              {!selectedBorderId && <CheckIcon className="h-5 w-5 text-emerald-400" />}
            </button>
          </div>

          {tierOrder.map(tier => {
            const tierBorders = groupedBorders[tier];
            if (!tierBorders?.length) return null;

            return (
              <div key={tier}>
                <h4 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className={clsx('w-3 h-3 rounded-full bg-gradient-to-r', TIER_COLORS[tier])} />
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {tierBorders.map(border => {
                    const tierStyles = {
                      bronze: { gradient: 'from-amber-600 to-amber-700', glow: '', ring: '' },
                      silver: { gradient: 'from-slate-300 via-slate-400 to-slate-300', glow: '', ring: 'ring-2 ring-slate-400/50' },
                      gold: { gradient: 'from-yellow-300 via-yellow-500 to-amber-600', glow: 'shadow-lg shadow-yellow-500/30', ring: 'ring-2 ring-yellow-400/50' },
                      platinum: { gradient: 'from-cyan-300 via-cyan-500 to-teal-500', glow: 'shadow-lg shadow-cyan-500/40', ring: 'ring-2 ring-cyan-400/50' },
                      diamond: { gradient: 'from-violet-400 via-purple-500 to-fuchsia-500', glow: 'shadow-xl shadow-violet-500/50', ring: 'ring-2 ring-violet-400/60' },
                      mythic: { gradient: 'from-rose-400 via-pink-500 to-rose-400', glow: 'shadow-2xl shadow-rose-500/60', ring: 'ring-4 ring-rose-400/60' },
                      special: { gradient: 'from-emerald-400 via-cyan-500 to-emerald-400', glow: 'shadow-lg shadow-emerald-500/40', ring: 'ring-2 ring-emerald-400/50' },
                    };
                    const style = tierStyles[border.tier] || tierStyles.bronze;

                    return (
                      <button
                        key={border.id}
                        onClick={() => handleSelect(border)}
                        disabled={!border.unlocked || selecting === border.id}
                        className={clsx(
                          'w-full flex items-center gap-4 p-3 rounded-xl border transition-all',
                          border.isSelected ? 'bg-emerald-500/20 border-emerald-500/50'
                            : border.unlocked ? 'bg-white/5 border-white/10 hover:border-white/20'
                            : 'bg-white/[0.02] border-white/10'
                        )}
                      >
                        <div className="relative">
                          {['diamond', 'mythic', 'platinum'].includes(border.tier) && (
                            <div className={clsx('absolute inset-0 rounded-full blur-md -z-10 opacity-60', `bg-gradient-to-br ${style.gradient}`)} />
                          )}
                          <div className={clsx('w-14 h-14 rounded-full p-[3px]', `bg-gradient-to-br ${style.gradient}`, style.glow, border.animation)}>
                            <div className={clsx('w-full h-full rounded-full bg-theme-card flex items-center justify-center overflow-hidden', style.ring)}>
                              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=preview" alt="Preview" className={clsx('w-full h-full object-cover', !border.unlocked && 'opacity-50')} />
                            </div>
                          </div>
                          {!border.unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                              <LockIcon className="h-5 w-5 text-white/70" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className={clsx('font-medium', border.unlocked ? 'text-white' : 'text-white/50')}>{border.name}</p>
                            <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border', RARITY_COLORS[border.rarity])}>{border.rarity}</span>
                          </div>
                          <p className="text-white/40 text-sm">{border.unlocked ? border.description : border.unlockReason}</p>
                        </div>

                        {selecting === border.id ? (
                          <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                        ) : border.isSelected ? (
                          <CheckIcon className="h-5 w-5 text-emerald-400" />
                        ) : !border.unlocked ? (
                          <LockIcon className="h-5 w-5 text-white/30" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
