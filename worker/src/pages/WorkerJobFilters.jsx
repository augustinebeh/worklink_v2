import { useState, useEffect, useMemo } from 'react';
import {
  SearchIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  ChevronLeftIcon,
  ClockIcon as PendingIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * PendingAccountOverlay - Blocks the UI when user account is pending approval
 */
export function PendingAccountOverlay() {
  useEffect(() => {
    document.body.classList.add('stop-scrolling');
    return () => {
      document.body.classList.remove('stop-scrolling');
    };
  }, []);

  return (
    <>
      {/* Frosted Background Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-theme-primary/80 backdrop-blur-md"
        aria-hidden="true"
      />

      {/* Modal Container - viewport centered with proper safe area handling */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
           style={{
             paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
             paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))'
           }}>
        <div className="w-full max-w-sm pointer-events-auto relative">
          {/* Outer glow */}
          <div className="absolute -inset-4 bg-amber-500/10 rounded-[2rem] blur-2xl" />

          {/* Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background - matching home page style */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />

            {/* Decorative orbs - amber/orange theme for pending */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-orange-500/25 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-yellow-500/20 rounded-full blur-2xl" />

            {/* Border */}
            <div className="absolute inset-0 rounded-3xl border border-amber-500/30" />

            {/* Content */}
            <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <PendingIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Account Pending Approval</h2>
                <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-4">
                  Your account is being reviewed. Once approved, you'll be able to browse and apply for jobs.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/70">Account created successfully</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin flex-shrink-0" />
                    <span className="text-amber-400">Awaiting admin approval</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                    <span className="text-white/40">Browse & apply for jobs</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/[0.08]">
              <p className="text-[10px] sm:text-xs text-white/40 text-center">
                This usually takes 1-2 business days. You'll receive a notification when your account is approved.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Pagination Component for job listings
 */
export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon className="h-5 w-5 text-white/60" />
      </button>

      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
        let pageNum;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={clsx(
              'w-9 h-9 rounded-lg text-sm font-medium transition-all',
              currentPage === pageNum
                ? 'bg-emerald-500 text-white'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            )}
          >
            {pageNum}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRightIcon className="h-5 w-5 text-white/60" />
      </button>
    </div>
  );
}

/**
 * WorkerJobFilters - Search bar and filter tabs for the Jobs page
 */
export default function WorkerJobFilters({
  search,
  setSearch,
  filter,
  setFilter,
  totalJobCount,
  availableCount,
  appliedCount,
  sortedJobCount
}) {
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Find Jobs</h1>
          <p className="text-white/40 text-sm">{sortedJobCount} opportunities available</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
          <BriefcaseIcon className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-medium">{appliedCount} Applied</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
        <input
          type="text"
          placeholder="Search jobs, locations, companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#0a1628] border border-white/[0.05] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Jobs', count: totalJobCount },
          { id: 'available', label: 'Available', count: availableCount },
          { id: 'applied', label: 'Applied', count: appliedCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              filter === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white hover:border-white/10'
            )}
          >
            {tab.label}
            <span className={clsx(
              'px-1.5 py-0.5 rounded-md text-xs',
              filter === tab.id ? 'bg-white/20' : 'bg-white/5'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
