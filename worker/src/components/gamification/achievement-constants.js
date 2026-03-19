import {
  TrophyIcon,
  StarIcon,
  FlameIcon,
  AwardIcon,
  GiftIcon,
  SparklesIcon,
  UserCheckIcon,
  BadgeCheckIcon,
  CrownIcon,
  BookOpenIcon,
  TargetIcon,
  UsersIcon,
  SwordIcon,
  HandIcon,
} from 'lucide-react';

// Map icon strings to components
export const ICON_MAP = {
  trophy: TrophyIcon,
  star: StarIcon,
  flame: FlameIcon,
  award: AwardIcon,
  gift: GiftIcon,
  sparkles: SparklesIcon,
  'user-check': UserCheckIcon,
  'badge-check': BadgeCheckIcon,
  crown: CrownIcon,
  'book-open': BookOpenIcon,
  target: TargetIcon,
  users: UsersIcon,
  'users-plus': UsersIcon,
  sword: SwordIcon,
  wave: HandIcon,
};

export const achievementCategories = {
  special: { icon: SparklesIcon, label: 'Getting Started', color: 'cyan' },
  milestones: { icon: TrophyIcon, label: 'Milestones', color: 'amber' },
  performance: { icon: StarIcon, label: 'Performance', color: 'violet' },
  streaks: { icon: FlameIcon, label: 'Streaks', color: 'red' },
  social: { icon: GiftIcon, label: 'Social', color: 'emerald' },
};

export const colorClasses = {
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/20' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
};

export const rarityColors = {
  common: 'text-white/60',
  rare: 'text-blue-400',
  epic: 'text-violet-400',
  legendary: 'text-amber-400',
};
