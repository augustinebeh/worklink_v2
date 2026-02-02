import { useState, useEffect } from 'react';
import {
  FlameIcon,
  ShieldIcon,
  ClockIcon,
  ZapIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  XIcon,
  HeartIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../ui/Toast';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

// Streak Protection Modal Component
export function StreakProtectionModal({
  isOpen,
  onClose,
  user,
  streakStatus,
  onProtect,
  onRecover
}) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Add keyboard navigation support
  const { modalRef } = useModalKeyboard({
    isOpen,
    onClose,
    autoFocus: true,
    trapFocus: true
  });

  if (!isOpen) return null;

  const handleProtectStreak = async () => {
    setIsLoading(true);
    try {
      await onProtect();
      toast.success('Streak Protected!', 'Your streak is safe for 24 hours');
      onClose();
    } catch (error) {
      toast.error('Protection Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverStreak = async () => {
    setIsLoading(true);
    try {
      await onRecover();
      toast.success('Streak Recovered!', 'Welcome back to your streak!');
      onClose();
    } catch (error) {
      toast.error('Recovery Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-md bg-theme-card rounded-3xl border border-white/10 overflow-hidden focus:outline-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        >
          <XIcon className="h-4 w-4 text-white" />
        </button>

        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20">
          <div className="flex items-center gap-3 mb-2">
            <FlameIcon className="h-8 w-8 text-orange-400" />
            <div>
              <h2 className="text-xl font-bold text-white">
                {streakStatus?.streakBroken ? 'Streak Broken!' : 'Streak at Risk!'}
              </h2>
              <p className="text-white/60 text-sm">
                {streakStatus?.streakBroken
                  ? 'But you can still recover it'
                  : `${streakStatus?.streak_days || 0}-day streak needs protection`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {streakStatus?.streakBroken ? (
            // Streak Recovery Section
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                  <HeartIcon className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-white/80 text-sm">
                  Your streak broke, but it's not too late! Use a recovery token to get back on track.
                </p>
              </div>

              {streakStatus?.canRecoverStreak ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RefreshCwIcon className="h-5 w-5 text-emerald-400" />
                      <span className="text-white font-medium">Recovery Token</span>
                    </div>
                    <span className="text-emerald-400 font-bold">
                      {streakStatus?.recovery_tokens || 0} available
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mb-4">
                    Instantly restore your {streakStatus?.streak_days}-day streak
                  </p>
                  <button
                    onClick={handleRecoverStreak}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Recovering...</span>
                      </div>
                    ) : (
                      'Use Recovery Token'
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-white/60 text-center">
                    No recovery tokens available. Keep going and start a new streak!
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Streak Protection Section
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangleIcon className="h-8 w-8 text-orange-400" />
                </div>
                <p className="text-white/80 text-sm">
                  {streakStatus?.hours_since_checkin
                    ? `You haven't checked in for ${Math.round(streakStatus.hours_since_checkin)} hours`
                    : 'Your streak needs protection'
                  }
                </p>
              </div>

              {/* Quick Check-in Option */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ZapIcon className="h-5 w-5 text-emerald-400" />
                    <span className="text-white font-medium">Quick Check-in</span>
                  </div>
                  <span className="text-emerald-400 text-sm">Free</span>
                </div>
                <p className="text-white/60 text-sm mb-4">
                  Just open the app daily to maintain your streak
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-medium hover:bg-emerald-500/40 transition-all"
                >
                  Check In Now (Free)
                </button>
              </div>

              {/* Freeze Token Protection */}
              {streakStatus?.canProtectStreak ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldIcon className="h-5 w-5 text-violet-400" />
                      <span className="text-white font-medium">Freeze Token</span>
                    </div>
                    <span className="text-violet-400 font-bold">
                      {streakStatus?.freeze_tokens || 0} available
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mb-4">
                    Protect your streak for 24 hours without checking in
                  </p>
                  <button
                    onClick={handleProtectStreak}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Protecting...</span>
                      </div>
                    ) : (
                      'Use Freeze Token'
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-white/60 text-center text-sm">
                    No freeze tokens available. Check in daily to maintain your streak!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Streak Alert Banner Component
export function StreakAlertBanner({
  streakStatus,
  onProtectClick,
  onDismiss
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (streakStatus?.streakAtRisk || streakStatus?.streakBroken) {
      setIsVisible(true);
    }
  }, [streakStatus]);

  if (!isVisible || (!streakStatus?.streakAtRisk && !streakStatus?.streakBroken)) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="mx-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40">
      <div className="flex items-start gap-3">
        <FlameIcon className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">
              {streakStatus?.streakBroken ? '💔 Streak Broken!' : '⚠️ Streak at Risk!'}
            </h3>
            <button
              onClick={handleDismiss}
              className="text-white/40 hover:text-white/60 transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <p className="text-white/70 text-xs mb-3">
            {streakStatus?.streakBroken
              ? `Your ${streakStatus?.streak_days}-day streak broke, but you can still recover it!`
              : `Your ${streakStatus?.streak_days}-day streak expires soon. Take action now!`
            }
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onProtectClick}
              className="px-3 py-1.5 rounded-lg bg-orange-500/30 text-orange-200 text-xs font-medium hover:bg-orange-500/40 transition-colors"
            >
              {streakStatus?.streakBroken ? 'Recover Streak' : 'Protect Streak'}
            </button>

            {streakStatus?.hours_since_checkin && (
              <div className="flex items-center gap-1 text-orange-300 text-xs">
                <ClockIcon className="h-3 w-3" />
                <span>
                  {streakStatus.streakBroken
                    ? `Broke ${Math.round(streakStatus.hours_since_checkin - 24)}h ago`
                    : `${Math.round(24 - streakStatus.hours_since_checkin)}h left`
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Daily Streak Card with Protection Status
export function EnhancedDailyStreakCard({ user, streakStatus, onClick }) {
  const streakDays = user?.streak_days || 1;
  const isProtected = streakStatus?.streak_protected_until && new Date(streakStatus.streak_protected_until) > new Date();
  const nextStreakReward = streakDays < 7 ? 7 : streakDays < 30 ? 30 : streakDays + 10;
  const progress = streakDays < 7 ? (streakDays / 7) * 100 :
                  streakDays < 30 ? ((streakDays - 7) / 23) * 100 :
                  ((streakDays % 10) / 10) * 100;

  return (
    <div
      className={clsx(
        "mx-4 mt-4 p-4 rounded-2xl border cursor-pointer transition-all",
        isProtected
          ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border-violet-500/30 hover:border-violet-500/50"
          : "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30 hover:border-orange-500/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isProtected ? "bg-violet-500/30" : "bg-orange-500/30"
          )}>
            {isProtected ? (
              <ShieldIcon className="h-6 w-6 text-violet-400" />
            ) : (
              <FlameIcon className="h-6 w-6 text-orange-400" />
            )}
          </div>
          {streakDays >= 7 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
              <span className="text-xs font-bold text-amber-900">{Math.min(streakDays, 99)}</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold">
              {isProtected ? "🛡️ Streak Protected!" :
               streakDays === 1 ? "Start Your Streak!" :
               `${streakDays} Day Streak!`}
            </h3>
            {streakDays >= 7 && !isProtected && <span className="text-orange-400">🔥</span>}
          </div>

          <p className="text-white/60 text-sm mb-2">
            {isProtected
              ? "Your streak is protected for 24 hours"
              : streakDays === 1
                ? "Check in tomorrow to build your streak"
                : `${nextStreakReward - streakDays} more days to next reward`
            }
          </p>

          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className={clsx(
                "h-2 rounded-full transition-all duration-500",
                isProtected
                  ? "bg-gradient-to-r from-violet-400 to-indigo-400"
                  : "bg-gradient-to-r from-orange-400 to-red-400"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Protection Status */}
        <div className="text-right">
          {streakStatus?.freeze_tokens > 0 && (
            <div className="text-xs text-violet-400 mb-1">
              {streakStatus.freeze_tokens} freeze tokens
            </div>
          )}
          {streakStatus?.recovery_tokens > 0 && (
            <div className="text-xs text-emerald-400">
              {streakStatus.recovery_tokens} recovery tokens
            </div>
          )}
        </div>
      </div>
    </div>
  );
}