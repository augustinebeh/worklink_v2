import { useState, useEffect } from 'react';
import {
  GiftIcon,
  CoinsIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, COLOR_THEMES } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { FilterTabs, SectionHeader } from '../components/common';
import { tierColors } from '../components/rewards/reward-constants';
import RewardGrid from '../components/rewards/RewardGrid';
import { FlairPickerModal, ThemePickerModal } from '../components/rewards/RewardFilters';

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
        <RewardGrid
          rewards={sortedRewards}
          loading={loading}
          filter={filter}
          userTier={userTier}
          userPoints={userPoints}
          onPurchase={handlePurchase}
          purchasing={purchasing}
          onCustomize={handleCustomize}
        />
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
