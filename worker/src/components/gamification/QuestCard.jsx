import { clsx } from 'clsx';

export default function QuestCard({ quest, onAccept, onComplete }) {
  const { 
    title, 
    description, 
    type, 
    xpReward, 
    progress = 0, 
    target = 1,
    status = 'available', // available, active, completed
    expiresAt,
  } = quest;

  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const progressPercent = (progress / target) * 100;

  const typeColors = {
    daily: 'from-secondary-600/20 to-transparent',
    weekly: 'from-primary-600/20 to-transparent',
    onboarding: 'from-accent-600/20 to-transparent',
    special: 'from-gold-600/20 to-transparent',
  };

  const typeBadgeColors = {
    daily: 'bg-secondary-900/50 text-secondary-400',
    weekly: 'bg-primary-900/50 text-primary-400',
    onboarding: 'bg-accent-900/50 text-accent-400',
    special: 'bg-gold-900/50 text-gold-400',
  };

  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h left`;
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  };

  return (
    <div className={clsx(
      'quest-card transition-all duration-200',
      isCompleted && 'opacity-60',
      !isCompleted && 'active:scale-[0.98]'
    )}>
      {/* Background gradient based on type */}
      <div className={clsx(
        'absolute inset-0 bg-gradient-to-r rounded-2xl',
        typeColors[type]
      )} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx(
                'text-2xs font-medium px-2 py-0.5 rounded-full uppercase',
                typeBadgeColors[type]
              )}>
                {type}
              </span>
              {expiresAt && (
                <span className="text-2xs text-dark-400">
                  {getTimeRemaining()}
                </span>
              )}
            </div>
            <h4 className={clsx(
              'font-semibold',
              isCompleted ? 'text-dark-400 line-through' : 'text-white'
            )}>
              {title}
            </h4>
          </div>

          {/* XP Reward */}
          <div className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-lg font-medium text-sm',
            isCompleted ? 'bg-accent-900/30 text-accent-400' : 'bg-dark-800 text-accent-400'
          )}>
            <span>+{xpReward}</span>
            <span className="text-xs">XP</span>
            {isCompleted && <span>✓</span>}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-dark-400 mb-3">
          {description}
        </p>

        {/* Progress */}
        {!isCompleted && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-dark-400 mb-1">
              <span>Progress</span>
              <span>{progress} / {target}</span>
            </div>
            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  type === 'special' ? 'bg-gradient-to-r from-gold-400 to-gold-500' :
                  type === 'daily' ? 'bg-gradient-to-r from-secondary-400 to-secondary-500' :
                  'bg-gradient-to-r from-primary-400 to-primary-500'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isCompleted && (
          <button
            onClick={progressPercent >= 100 ? onComplete : onAccept}
            disabled={isActive && progressPercent < 100}
            aria-label={
              progressPercent >= 100
                ? `Claim ${xpReward} XP reward for ${title}`
                : isActive
                ? `Quest ${title} is in progress`
                : `Accept quest: ${title}`
            }
            className={clsx(
              'w-full min-h-[44px] py-3 rounded-xl font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50',
              progressPercent >= 100
                ? 'bg-accent-600 text-white active:scale-95'
                : isActive
                ? 'bg-dark-800 text-dark-300 cursor-default'
                : 'bg-primary-600 text-white active:scale-95'
            )}
          >
            {progressPercent >= 100
              ? '🎉 Claim Reward'
              : isActive
              ? 'In Progress...'
              : 'Accept Quest'
            }
          </button>
        )}

        {isCompleted && (
          <div className="text-center py-2 text-accent-400 text-sm font-medium">
            ✓ Completed
          </div>
        )}
      </div>
    </div>
  );
}
