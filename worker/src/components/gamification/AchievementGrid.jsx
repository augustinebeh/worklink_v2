import { TrophyIcon } from 'lucide-react';
import { EmptyState, LoadingSkeleton } from '../common';
import AchievementListCard from './AchievementListCard';

export default function AchievementGrid({
  achievements,
  userAchievements,
  loading,
  filter,
  onClaim,
  claiming,
}) {
  if (loading) {
    return <LoadingSkeleton count={4} height="h-24" />;
  }

  if (achievements.length === 0) {
    return (
      <EmptyState
        icon={TrophyIcon}
        title={filter === 'claimable' ? 'No achievements to claim' : 'No achievements found'}
        description={filter === 'claimable' ? 'Unlock achievements to claim XP' : 'Keep working to unlock achievements'}
      />
    );
  }

  return (
    <div className="space-y-3">
      {achievements.map(achievement => (
        <AchievementListCard
          key={achievement.id}
          achievement={achievement}
          unlocked={userAchievements[achievement.id]?.unlocked}
          claimed={userAchievements[achievement.id]?.claimed}
          onClaim={onClaim}
          claiming={claiming === achievement.id}
        />
      ))}
    </div>
  );
}
