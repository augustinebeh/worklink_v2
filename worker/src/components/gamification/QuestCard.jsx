import { useNavigate } from 'react-router-dom';
import {
  ZapIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  SparklesIcon,
  ChevronRightIcon,
  FlameIcon,
  CheckIcon,
  TrophyIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { QUEST_TYPE_LABELS, QUEST_TYPE_STYLES } from '../../utils/constants';

// Quest type icons mapping
const QUEST_ICONS = {
  daily: ClockIcon,
  weekly: StarIcon,
  special: SparklesIcon,
  repeatable: TrophyIcon,
  challenge: FlameIcon,
};

export default function QuestCard({ quest, onClaim, onCheckin, claiming }) {
  const navigate = useNavigate();
  const config = QUEST_TYPE_STYLES[quest.type] || QUEST_TYPE_STYLES.daily;
  const typeLabel = QUEST_TYPE_LABELS?.[quest.type] || 'Daily';
  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const Icon = QUEST_ICONS[quest.type] || QUEST_ICONS.daily;

  const isClaimed = quest.status === 'claimed';
  const isClaimable = quest.status === 'claimable';

  // Check if this is a check-in type quest (like daily login)
  const isCheckinQuest = quest.requirement?.type === 'checkin' ||
                         quest.title?.toLowerCase().includes('check') ||
                         quest.title?.toLowerCase().includes('login') ||
                         quest.title?.toLowerCase().includes('daily');
  const canCheckin = isCheckinQuest && !isClaimed && !isClaimable && quest.progress < quest.target;

  const handleQuestClick = () => {
    if (isClaimed) return;

    // If claimable, don't navigate - just let them claim
    if (isClaimable) return;

    // If it's a check-in quest, trigger check-in
    if (canCheckin) {
      onCheckin(quest);
      return;
    }

    // Navigate based on requirement type
    const reqType = quest.requirement?.type || '';
    if (reqType.includes('job')) navigate('/jobs');
    else if (reqType.includes('training')) navigate('/training');
    else if (reqType.includes('referral')) navigate('/referrals');
    else if (reqType.includes('profile')) navigate('/complete-profile');
  };

  return (
    <div
      onClick={handleQuestClick}
      className={clsx(
        'relative p-4 rounded-2xl transition-all',
        isClaimed
          ? 'bg-white/[0.02] border border-white/[0.03] opacity-40'
          : isClaimable
            ? 'bg-emerald-500/10 border border-emerald-500/30 cursor-default'
            : canCheckin
              ? 'bg-cyan-500/10 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/20'
              : 'bg-[#0a1628]/80 border border-white/[0.05] hover:border-white/10 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          isClaimed ? 'bg-white/5' : isClaimable ? 'bg-emerald-500/20' : canCheckin ? 'bg-cyan-500/20' : config.bg
        )}>
          {isClaimed ? (
            <CheckCircleIcon className="h-6 w-6 text-white/30" />
          ) : canCheckin ? (
            <CheckIcon className="h-6 w-6 text-cyan-400" />
          ) : (
            <Icon className={clsx('h-6 w-6', isClaimable ? 'text-emerald-400' : config.color)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx(
              'px-2 py-0.5 rounded-md text-xs font-medium',
              isClaimed ? 'bg-white/5 text-white/30' : `${config.bg} ${config.color}`
            )}>
              {typeLabel}
            </span>
            {isClaimable && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-medium animate-pulse">
                Ready!
              </span>
            )}
            {canCheckin && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                Tap to check in
              </span>
            )}
          </div>

          <h3 className={clsx(
            'font-semibold',
            isClaimed ? 'text-white/30 line-through' : 'text-white'
          )}>
            {quest.title}
          </h3>

          <p className={clsx('text-sm mt-0.5', isClaimed ? 'text-white/20' : 'text-white/40')}>
            {quest.description}
          </p>

          {/* Progress Bar */}
          {!isClaimed && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/40">Progress</span>
                <span className={isClaimable ? 'text-emerald-400 font-medium' : 'text-white/60'}>
                  {quest.progress}/{quest.target}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    isClaimable
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-gradient-to-r from-violet-500 to-cyan-500'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reward & Action */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/20">
            <ZapIcon className="h-3.5 w-3.5 text-violet-400" />
            <span className={clsx('text-sm font-bold', isClaimed ? 'text-white/30' : 'text-violet-400')}>
              +{quest.xp_reward}
            </span>
          </div>

          {isClaimable && (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(quest); }}
              disabled={claiming}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {claiming ? 'Claiming...' : 'Claim'}
            </button>
          )}

          {canCheckin && (
            <button
              onClick={(e) => { e.stopPropagation(); onCheckin(quest); }}
              disabled={claiming}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {claiming ? '...' : 'Check In'}
            </button>
          )}

          {!isClaimed && !isClaimable && !canCheckin && (
            <ChevronRightIcon className="h-5 w-5 text-white/20" />
          )}
        </div>
      </div>
    </div>
  );
}
