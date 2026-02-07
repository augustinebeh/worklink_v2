import { ZapIcon, GiftIcon, CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { SectionHeader } from '../common';
import HomeQuestCard from './HomeQuestCard';

function QuestPreviewItem({ title, description, reward, progress, total, completed }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <div className={clsx(
        "w-8 h-8 rounded-full flex items-center justify-center border-2",
        completed ? "bg-emerald-500/30 border-emerald-500" : "bg-white/5 border-white/20"
      )}>
        {completed ? (
          <span className="text-emerald-400 text-sm">✓</span>
        ) : (
          <span className="text-white/40 text-xs">{progress}/{total}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={clsx(
          "font-medium text-sm",
          completed ? "text-emerald-400" : "text-white"
        )}>
          {title}
        </h4>
        <p className="text-white/50 text-xs">{description}</p>
      </div>

      <div className="flex items-center gap-1 text-violet-400 text-sm font-medium">
        <ZapIcon className="h-3 w-3" />
        <span>+{reward}</span>
      </div>
    </div>
  );
}

export default function QuestSection({ user, quests, allQuests, onClaim, claimingQuest, navigate }) {
  const hasClaimableQuests = quests.length > 0;

  if (hasClaimableQuests) {
    return (
      <div className="px-4 mt-6">
        <SectionHeader
          title="Rewards Ready!"
          icon={GiftIcon}
          iconColor="text-amber-400"
          actionLabel="All Quests →"
          onAction={() => navigate('/quests')}
        />
        <div className="space-y-3">
          {quests.map(quest => (
            <HomeQuestCard
              key={quest.id}
              quest={quest}
              onClaim={onClaim}
              isClaiming={claimingQuest === quest.id}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mt-6">
      <SectionHeader
        title="Daily Quests"
        icon={CalendarIcon}
        iconColor="text-violet-400"
        actionLabel="View All →"
        onAction={() => navigate('/quests')}
      />
      <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
        <div className="space-y-3">
          <QuestPreviewItem title="Check-In Champion" description="Open the app daily" reward="10 XP" progress={1} total={1} completed={true} />
          <QuestPreviewItem title="Ready to Work" description="Apply for a job" reward="50 XP" progress={0} total={1} completed={false} />
          <QuestPreviewItem title="Fast Finger" description="Apply within 5 minutes of posting" reward="20 XP" progress={0} total={1} completed={false} />
        </div>
        <div className="mt-4 pt-3 border-t border-white/10">
          <button
            onClick={() => navigate('/quests')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30 text-violet-300 font-medium hover:bg-violet-500/30 transition-all"
          >
            Start Daily Quests
          </button>
        </div>
      </div>
    </div>
  );
}
