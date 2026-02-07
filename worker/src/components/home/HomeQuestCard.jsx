import { useState, useRef } from 'react';
import { ZapIcon, TrophyIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { QUEST_TYPE_STYLES } from '../../utils/constants';

const QUEST_ICONS = {
  daily: () => null,
  weekly: () => null,
  special: () => null,
  repeatable: () => null,
  challenge: () => null,
};

export default function HomeQuestCard({ quest, onClaim, isClaiming }) {
  const [isExiting, setIsExiting] = useState(false);
  const xpBadgeRef = useRef(null);

  const isClaimable = quest.status === 'claimable';

  const handleClaim = (e) => {
    e.stopPropagation();
    if (isClaiming || !isClaimable) return;

    const rect = xpBadgeRef.current?.getBoundingClientRect();
    const startPos = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;

    setIsExiting(true);
    onClaim(quest, startPos);
  };

  if (!isClaimable || quest.status === 'claimed') return null;

  return (
    <div
      className={clsx(
        'relative p-4 rounded-2xl transition-all duration-500 ease-out',
        isExiting && 'opacity-0 scale-95 -translate-y-4 h-0 p-0 mb-0 overflow-hidden',
        'bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-violet-500/20 border-2 border-emerald-500/40'
      )}
      style={{ boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)' }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 animate-pulse" />
      </div>

      <div className="relative flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <TrophyIcon className="h-7 w-7 text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 text-xs font-bold animate-pulse">
              🎉 READY TO CLAIM!
            </span>
          </div>
          <h3 className="font-bold text-white">{quest.title}</h3>
          <p className="text-sm text-white/50">{quest.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            ref={xpBadgeRef}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-500/30 border border-violet-500/40"
          >
            <ZapIcon className="h-4 w-4 text-violet-400" />
            <span className="text-lg font-bold text-violet-300">+{quest.xp_reward}</span>
          </div>

          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-95 transition-all disabled:opacity-50"
          >
            {isClaiming ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Claiming...</span>
              </div>
            ) : (
              <span>Claim Reward</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
