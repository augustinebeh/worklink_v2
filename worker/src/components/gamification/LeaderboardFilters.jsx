import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  CrownIcon,
  ZapIcon,
  StarIcon,
  SparklesIcon,
  UsersIcon,
  RocketIcon,
} from 'lucide-react';

export default function ComingSoonOverlay() {
  // Lock body scroll when overlay is shown
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-theme-primary/95 backdrop-blur-md"
      style={{ position: 'fixed', height: '100dvh', width: '100vw' }}
    >
      {/* Centered Frame - does not scroll */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[75vh] overflow-y-auto overscroll-contain rounded-3xl bg-theme-card border border-white/10 p-6 shadow-2xl">
        <div className="text-center">
          {/* Animated icon */}
          <div className="relative mb-8 mx-auto w-32 h-32">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <TrophyIcon className="h-16 w-16 text-violet-400" />
            </div>
            {/* Floating badges */}
            <div className="absolute top-0 left-1/4 -translate-x-1/2 animate-bounce" style={{ animationDelay: '0.2s' }}>
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <CrownIcon className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="absolute top-1/4 right-0 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <StarIcon className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 animate-bounce" style={{ animationDelay: '0.8s' }}>
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <ZapIcon className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Leaderboard Coming Soon
          </h1>

          <p className="text-white/60 text-base sm:text-lg mb-6">
            We're building something exciting! Compete with other workers and climb to the top.
          </p>

          {/* Feature preview */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-violet-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">Weekly Rankings</h3>
                <p className="text-white/40 text-sm">Compete for the top spot every week</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">Exclusive Rewards</h3>
                <p className="text-white/40 text-sm">Top performers earn special bonuses</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">Community Stats</h3>
                <p className="text-white/40 text-sm">See how you stack up against others</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <RocketIcon className="h-5 w-5 text-violet-400" />
              <span className="text-white font-semibold">Get Ready!</span>
            </div>
            <p className="text-white/50 text-sm">
              Complete quests and earn XP now to get a head start when the leaderboard launches!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
