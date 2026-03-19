import { GiftIcon } from 'lucide-react';
import { EmptyState, LoadingSkeleton } from '../common';
import RewardCard from './RewardCard';

export default function RewardGrid({ rewards, loading, filter, userTier, userPoints, onPurchase, purchasing, onCustomize }) {
  if (loading) {
    return <LoadingSkeleton count={4} height="h-28" />;
  }

  if (rewards.length === 0) {
    return (
      <EmptyState
        icon={GiftIcon}
        title={filter === 'available' ? 'No rewards available' : filter === 'owned' ? 'No rewards owned yet' : 'No rewards found'}
        description={filter === 'available' ? 'Earn more points or level up to unlock rewards' : 'Purchase rewards to see them here'}
      />
    );
  }

  return (
    <div className="space-y-3">
      {rewards.map(reward => (
        <RewardCard
          key={reward.id}
          reward={reward}
          userTier={userTier}
          userPoints={userPoints}
          onPurchase={onPurchase}
          purchasing={purchasing === reward.id}
          onCustomize={onCustomize}
        />
      ))}
    </div>
  );
}
