import { clsx } from 'clsx';

/**
 * Shared Loading Skeleton Component
 */
export default function LoadingSkeleton({
  count = 3,
  height = 'h-20',
  className = '',
}) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'rounded-2xl bg-[#0a1628] animate-pulse',
            height
          )}
        />
      ))}
    </div>
  );
}

// Card skeleton variant
export function CardSkeleton({ count = 1 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-[#0a1628] animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/5" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// List skeleton variant
export function ListSkeleton({ count = 5 }) {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded bg-white/5" />
            <div className="h-3 w-1/3 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
