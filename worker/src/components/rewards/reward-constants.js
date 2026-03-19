import {
  PaletteIcon,
  SparklesIcon,
  RefreshCwIcon,
  ZapIcon,
  ShieldIcon,
  HardHatIcon,
  ShirtIcon,
  AwardIcon,
  GiftIcon,
  PackageIcon,
} from 'lucide-react';

// Map icon strings to components
export const ICON_MAP = {
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

export const categoryInfo = {
  feature: { icon: SparklesIcon, label: 'Feature Unlock', color: 'violet' },
  operational: { icon: ZapIcon, label: 'Perk', color: 'cyan' },
  physical: { icon: PackageIcon, label: 'Physical Item', color: 'amber' },
};

export const tierColors = {
  bronze: { text: 'text-amber-600', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  silver: { text: 'text-slate-300', bg: 'bg-slate-400/20', border: 'border-slate-400/30' },
  gold: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  platinum: { text: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  diamond: { text: 'text-violet-300', bg: 'bg-violet-500/20', border: 'border-violet-500/30' },
  mythic: { text: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
};

export const colorClasses = {
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
};

// Available flair emojis
export const FLAIR_OPTIONS = [
  null, // No flair
  '🔥', '⭐', '💎', '🏆', '👑', '🚀', '💪', '🎯',
  '⚡', '🌟', '✨', '💫', '🎖️', '🥇', '🏅', '💯',
  '🦁', '🐯', '🦅', '🐺', '🦊', '🐲', '🦋', '🌈',
];
