import { useState, useEffect } from 'react';
import {
  GiftIcon,
  ZapIcon,
  LockIcon,
  CheckCircleIcon,
  SparklesIcon,
  PaletteIcon,
  ShieldIcon,
  RefreshCwIcon,
  HardHatIcon,
  ShirtIcon,
  AwardIcon,
  CoinsIcon,
  PackageIcon,
  XIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, COLOR_THEMES } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { FilterTabs, EmptyState, LoadingSkeleton, SectionHeader } from '../components/common';

// Map icon strings to components
const ICON_MAP = {
  palette: PaletteIcon,
  sparkles: SparklesIcon,
  'refresh-cw': RefreshCwIcon,
  zap: ZapIcon,
  shield: ShieldIcon,
  'hard-hat': HardHatIcon,
  shirt: ShirtIcon,
  award: AwardIcon,
  gift: GiftIcon,
};

const categoryInfo = {
  feature: { icon: SparklesIcon, label: 'Feature Unlock', color: 'violet' },
  operational: { icon: ZapIcon, label: 'Perk', color: 'cyan' },
  physical: { icon: PackageIcon, label: 'Physical Item', color: 'amber' },
};

const tierColors = {
  bronze: { text: 'text-amber-600', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  silver: { text: 'text-slate-300', bg: 'bg-slate-400/20', border: 'border-slate-400/30' },
  gold: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  platinum: { text: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  diamond: { text: 'text-violet-300', bg: 'bg-violet-500/20', border: 'border-violet-500/30' },
  mythic: { text: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
};

const colorClasses = {
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
};

// Available flair emojis
const FLAIR_OPTIONS = [
  null, // No flair
  '🔥', '⭐', '💎', '🏆', '👑', '🚀', '💪', '🎯',
  '⚡', '🌟', '✨', '💫', '🎖️', '🥇', '🏅', '💯',
  '🦁', '🐯', '🦅', '🐺', '🦊', '🐲', '🦋', '🌈',
];

// Flair Picker Modal
function FlairPickerModal({ isOpen, onClose, currentFlair, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Choose Your Flair</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <XIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">Select an emoji to display next to your name</p>
        <div className="grid grid-cols-6 gap-2">
          {FLAIR_OPTIONS.map((flair, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(flair)}
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all',
                currentFlair === flair
                  ? 'bg-violet-500/30 border-2 border-violet-500'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              )}
            >
              {flair || <span className="text-sm text-white/30">None</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Theme Picker Modal
function ThemePickerModal({ isOpen, onClose, currentTheme, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Choose Theme</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <XIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">Select a color theme for your app</p>
        <div className="space-y-2">
          {Object.entries(COLOR_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={clsx(
                'w-full p-3 rounded-xl flex items-center gap-3 transition-all',
                currentTheme === key
                  ? 'bg-violet-500/20 border-2 border-violet-500'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              )}
            >
              <div
                className={clsx('w-10 h-10 rounded-lg bg-gradient-to-br', theme.preview)}
                style={{ backgroundColor: theme.bg }}
              >
                <div
                  className="w-full h-full rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}40, ${theme.accent}40)` }}
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">{theme.name}</p>
                <p className="text-xs text-white/50">{theme.description}</p>
              </div>
              {currentTheme === key && (
                <CheckCircleIcon className="h-5 w-5 text-violet-400 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RewardCard({ reward, userTier, userPoints, onPurchase, purchasing, onCustomize }) {
  const category = categoryInfo[reward.category] || categoryInfo.feature;
  const IconComponent = ICON_MAP[reward.icon] || category.icon;
  const colors = colorClasses[category.color];
  const tierColor = tierColors[reward.tier_required] || tierColors.bronze;

  const canPurchase = reward.canPurchase;
  const isLocked = !reward.meetsRequirement;
  const isOwned = reward.purchaseCount > 0;
  const cantAfford = !reward.canAfford && reward.meetsRequirement;

  // Check if this reward has customization options
  const hasCustomization = isOwned && (reward.id === 'RWD_PROFILE_FLAIR' || reward.id === 'RWD_DARK_MODE');

  // Default background for non-special state cards
  const cardStyle = (!isOwned && !isLocked && !canPurchase) ? { backgroundColor: 'var(--bg-card)' } : {};

  return (
    <div
      className={clsx(
        'relative p-4 rounded-2xl border transition-all',
        isOwned
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : isLocked
            ? 'bg-white/[0.02] border-white/[0.03] opacity-60'
            : canPurchase
              ? `bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/40 shadow-lg ${colors.glow}`
              : `${colors.border}`
      )}
      style={cardStyle}
    >
      {/* Owned indicator */}
      {isOwned && (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckCircleIcon className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all',
          isOwned
            ? 'bg-emerald-500/30 border border-emerald-500/40'
            : isLocked
              ? 'bg-white/5'
              : canPurchase
                ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/40'
                : colors.bg
        )}>
          {isLocked ? (
            <LockIcon className="h-6 w-6 text-white/20" />
          ) : (
            <IconComponent className={clsx('h-7 w-7', isOwned ? 'text-emerald-400' : canPurchase ? 'text-emerald-400' : colors.text)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={clsx('font-semibold', isLocked ? 'text-white/40' : 'text-white')}>
              {reward.name}
            </h3>
            {isOwned && <span className="text-xs text-emerald-400">Owned</span>}
          </div>
          <p className={clsx('text-sm', isLocked ? 'text-white/30' : 'text-white/50')}>
            {reward.description}
          </p>

          {/* Tags row */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full',
              isLocked ? 'bg-white/5 text-white/30' : `${colors.bg} ${colors.text}`
            )}>
              {category.label}
            </span>
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full capitalize',
              tierColor.bg, tierColor.text
            )}>
              {reward.tier_required}+
            </span>
            {reward.stock !== null && (
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                reward.stock > 0 ? 'bg-white/5 text-white/50' : 'bg-red-500/20 text-red-400'
              )}>
                {reward.stock > 0 ? `${reward.stock} left` : 'Out of stock'}
              </span>
            )}
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex flex-col items-end gap-2">
          <div className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-lg',
            cantAfford ? 'bg-red-500/20' : 'bg-emerald-500/20'
          )}>
            <CoinsIcon className={clsx('h-3.5 w-3.5', cantAfford ? 'text-red-400' : 'text-emerald-400')} />
            <span className={clsx('text-sm font-bold', cantAfford ? 'text-red-400' : 'text-emerald-400')}>
              {reward.points_cost}
            </span>
          </div>

          {!isOwned && canPurchase && (
            <button
              onClick={() => onPurchase(reward)}
              disabled={purchasing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {purchasing ? '...' : 'Redeem'}
            </button>
          )}

          {hasCustomization && (
            <button
              onClick={() => onCustomize(reward.id)}
              className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm font-semibold hover:bg-violet-500/30 active:scale-95 transition-all"
            >
              Customize
            </button>
          )}

          {isLocked && (
            <span className="text-xs text-white/30">
              Reach {reward.tier_required}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat pod component
function StatPod({ label, value, icon: Icon, color = 'white' }) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    white: 'text-white bg-white/5',
  };

  return (
    <div className={clsx('p-3 rounded-2xl text-center border', colorMap[color])}>
      {Icon && <Icon className={clsx('h-4 w-4 mx-auto mb-1', color === 'white' ? 'text-white/50' : '')} />}
      <p className={clsx('text-2xl font-bold', color === 'white' ? 'text-white' : '')}>{value}</p>
      <p className="text-xs text-white/40">{label}</p>
    </div>
  );
}

export default function Rewards() {
  const { user, refreshUser } = useAuth();
  const { colorTheme, setColorTheme } = useTheme();
  const toast = useToast();
  const [rewards, setRewards] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState('bronze');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [purchasing, setPurchasing] = useState(null);

  // Flair state
  const [currentFlair, setCurrentFlair] = useState(null);
  const [showFlairPicker, setShowFlairPicker] = useState(false);

  // Theme state
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRewards();
      fetchFlair();
    }
  }, [user]);

  const fetchRewards = async () => {
    try {
      const res = await fetch(`/api/v1/gamification/rewards/user/${user.id}`);
      const data = await res.json();

      if (data.success) {
        setRewards(data.data.rewards || []);
        setPurchases(data.data.purchases || []);
        setUserPoints(data.data.userPoints || 0);
        setUserTier(data.data.userTier || 'bronze');
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlair = async () => {
    try {
      const res = await fetch(`/api/v1/gamification/flair/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentFlair(data.data.flair);
      }
    } catch (error) {
      console.error('Failed to fetch flair:', error);
    }
  };

  const handlePurchase = async (reward) => {
    setPurchasing(reward.id);
    try {
      const res = await fetch(`/api/v1/gamification/rewards/${reward.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Reward Redeemed!', `${reward.name} is yours!`);
        setUserPoints(data.data.newBalance);
        fetchRewards();
        refreshUser();
      } else {
        toast.error('Failed', data.error || 'Could not redeem reward');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    } finally {
      setPurchasing(null);
    }
  };

  const handleCustomize = (rewardId) => {
    if (rewardId === 'RWD_PROFILE_FLAIR') {
      setShowFlairPicker(true);
    } else if (rewardId === 'RWD_DARK_MODE') {
      setShowThemePicker(true);
    }
  };

  const handleFlairSelect = async (flair) => {
    try {
      const res = await fetch(`/api/v1/gamification/flair/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flair }),
      });
      const data = await res.json();

      if (data.success) {
        setCurrentFlair(flair);
        setShowFlairPicker(false);
        toast.success('Flair Updated!', flair ? `Your flair is now ${flair}` : 'Flair removed');
        refreshUser();
      } else {
        toast.error('Failed', data.error);
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    }
  };

  const handleThemeSelect = async (theme) => {
    try {
      const res = await fetch(`/api/v1/gamification/theme/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
      const data = await res.json();

      if (data.success) {
        setColorTheme(theme);
        setShowThemePicker(false);
        toast.success('Theme Updated!', `Theme changed to ${COLOR_THEMES[theme].name}`);
      } else {
        toast.error('Failed', data.error);
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    }
  };

  const availableCount = rewards.filter(r => r.canPurchase).length;
  const ownedCount = rewards.filter(r => r.purchaseCount > 0).length;
  const lockedCount = rewards.filter(r => !r.meetsRequirement).length;

  const filteredRewards = rewards.filter(r => {
    if (filter === 'available') return r.canPurchase;
    if (filter === 'owned') return r.purchaseCount > 0;
    if (filter === 'locked') return !r.meetsRequirement;
    return true;
  });

  // Sort: available first, then owned, then locked
  const sortedRewards = [...filteredRewards].sort((a, b) => {
    const aScore = a.purchaseCount > 0 ? 1 : (a.canPurchase ? 2 : (a.meetsRequirement ? 0 : -1));
    const bScore = b.purchaseCount > 0 ? 1 : (b.canPurchase ? 2 : (b.meetsRequirement ? 0 : -1));
    return bScore - aScore;
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'available', label: `Available (${availableCount})` },
    { id: 'owned', label: `Owned (${ownedCount})` },
    { id: 'locked', label: `Locked (${lockedCount})` },
  ];

  // Check if user owns the feature rewards
  const ownsFlairReward = rewards.find(r => r.id === 'RWD_PROFILE_FLAIR')?.purchaseCount > 0;
  const ownsThemeReward = rewards.find(r => r.id === 'RWD_DARK_MODE')?.purchaseCount > 0;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid), var(--gradient-end))' }} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <GiftIcon className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Rewards Shop</h1>
                <p className="text-white/50">Spend your points on perks</p>
              </div>
            </div>

            {/* Points Balance */}
            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CoinsIcon className="h-8 w-8 text-emerald-400" />
                  <div>
                    <p className="text-sm text-white/50">Your Balance</p>
                    <p className="text-3xl font-bold text-emerald-400">{userPoints.toLocaleString()}</p>
                  </div>
                </div>
                <div className={clsx(
                  'px-3 py-1.5 rounded-xl capitalize font-semibold',
                  tierColors[userTier]?.bg,
                  tierColors[userTier]?.text,
                  tierColors[userTier]?.border,
                  'border'
                )}>
                  {userTier} Tier
                </div>
              </div>
            </div>

            {/* Active Perks Row */}
            {(ownsFlairReward || ownsThemeReward) && (
              <div className="mb-4 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30">
                <p className="text-xs text-violet-400 font-medium mb-2">Active Perks</p>
                <div className="flex gap-2 flex-wrap">
                  {ownsFlairReward && (
                    <button
                      onClick={() => setShowFlairPicker(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-lg">{currentFlair || '✨'}</span>
                      <span className="text-sm text-white/70">Flair</span>
                    </button>
                  )}
                  {ownsThemeReward && (
                    <button
                      onClick={() => setShowThemePicker(true)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded"
                        style={{ background: `linear-gradient(135deg, ${COLOR_THEMES[colorTheme].primary}, ${COLOR_THEMES[colorTheme].accent})` }}
                      />
                      <span className="text-sm text-white/70">{COLOR_THEMES[colorTheme].name}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <StatPod label="Available" value={availableCount} color="emerald" />
              <StatPod label="Owned" value={ownedCount} color="violet" />
              <StatPod label="Locked" value={lockedCount} color="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Rewards List */}
      <div className="px-4 mt-6">
        <SectionHeader title="All Rewards" icon={GiftIcon} iconColor="text-emerald-400" />

        <FilterTabs tabs={tabs} activeFilter={filter} onFilterChange={setFilter} />
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={4} height="h-28" />
        ) : sortedRewards.length === 0 ? (
          <EmptyState
            icon={GiftIcon}
            title={filter === 'available' ? 'No rewards available' : filter === 'owned' ? 'No rewards owned yet' : 'No rewards found'}
            description={filter === 'available' ? 'Earn more points or level up to unlock rewards' : 'Purchase rewards to see them here'}
          />
        ) : (
          <div className="space-y-3">
            {sortedRewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                userTier={userTier}
                userPoints={userPoints}
                onPurchase={handlePurchase}
                purchasing={purchasing === reward.id}
                onCustomize={handleCustomize}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <FlairPickerModal
        isOpen={showFlairPicker}
        onClose={() => setShowFlairPicker(false)}
        currentFlair={currentFlair}
        onSelect={handleFlairSelect}
      />

      <ThemePickerModal
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        currentTheme={colorTheme}
        onSelect={handleThemeSelect}
      />
    </div>
  );
}
