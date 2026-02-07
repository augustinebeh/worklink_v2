import { useState, useEffect } from 'react';
import { ZapIcon, TrophyIcon, WalletIcon, GiftIcon, ActivityIcon } from 'lucide-react';
import { clsx } from 'clsx';

export default function LiveActivityFeed({ userLevel }) {
  const [activities] = useState([
    { text: "Sarah just earned 200 XP completing a 4-hour shift!", icon: ZapIcon, color: "text-violet-400" },
    { text: "Mike leveled up to Silver League 🥈", icon: TrophyIcon, color: "text-amber-400" },
    { text: "3 workers claimed the 'Early Bird' quest today", icon: GiftIcon, color: "text-emerald-400" },
    { text: "Lisa just unlocked instant payouts!", icon: WalletIcon, color: "text-cyan-400" },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activities.length]);

  const activity = activities[currentIndex];
  const Icon = activity.icon;

  return (
    <div className="mx-4 mt-6 p-4 rounded-2xl bg-gradient-to-r from-slate-800/30 to-slate-700/30 border border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <ActivityIcon className="h-5 w-5 text-white/60" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-white/80 text-sm transition-all duration-500">
            <Icon className={clsx("h-4 w-4", activity.color)} />
            <span>{activity.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
