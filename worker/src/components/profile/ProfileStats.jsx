import {
  BriefcaseIcon,
  TrophyIcon,
  SparklesIcon,
} from 'lucide-react';
import { StatCard } from '../common';

export default function ProfileStats({ jobsCompleted, achievementCount, tier }) {
  return (
    <div className="px-4 mt-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={BriefcaseIcon} label="Jobs Completed" value={jobsCompleted} color="emerald" />
        <StatCard icon={TrophyIcon} label="Achievements" value={achievementCount} color="amber" />
        <StatCard icon={SparklesIcon} label="Tier" value={tier} color="cyan" />
      </div>
    </div>
  );
}
