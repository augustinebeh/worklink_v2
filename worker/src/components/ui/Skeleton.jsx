import { clsx } from 'clsx';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-dark-700 rounded',
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonJobCard() {
  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-dark-800/50">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function SkeletonQuestCard() {
  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-dark-800/50">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-5 w-3/4 mt-2" />
      <Skeleton className="h-4 w-full mt-2" />
      <Skeleton className="h-2 w-full mt-3 rounded-full" />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-dark-800/50">
      <Skeleton className="h-5 w-5 rounded mb-2" />
      <Skeleton className="h-6 w-12" />
      <Skeleton className="h-3 w-16 mt-1" />
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
    </div>
  );
}

export function SkeletonAchievement() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/50 border border-white/5">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, children }) {
  const SkeletonItem = children || SkeletonJobCard;
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
