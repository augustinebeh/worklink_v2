import { clsx } from 'clsx';

/**
 * Status configuration for different contexts
 */
export const STATUS_CONFIG = {
  // Payment statuses
  payment: {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Pending' },
    approved: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'Approved' },
    paid: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Paid' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Failed' },
  },
  // Job statuses
  job: {
    open: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Open' },
    filled: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'Filled' },
    completed: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', label: 'Completed' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Cancelled' },
  },
  // Deployment statuses
  deployment: {
    assigned: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', label: 'Assigned' },
    confirmed: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'Confirmed' },
    checked_in: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Checked In' },
    completed: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', label: 'Completed' },
    no_show: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'No Show' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Cancelled' },
  },
  // Quest statuses
  quest: {
    available: { color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10', label: 'Available' },
    in_progress: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', label: 'In Progress' },
    claimable: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Ready!' },
    claimed: { color: 'text-white/30', bg: 'bg-white/5', border: 'border-white/10', label: 'Claimed' },
  },
  // Referral statuses
  referral: {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Pending' },
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Completed' },
    rewarded: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', label: 'Rewarded' },
  },
  // Generic statuses
  generic: {
    active: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Active' },
    inactive: { color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10', label: 'Inactive' },
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Pending' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Success' },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Error' },
  },
};

/**
 * Shared Status Badge Component
 */
export default function StatusBadge({
  status,
  type = 'generic',
  size = 'md',
  showBorder = false,
  customLabel,
}) {
  const config = STATUS_CONFIG[type]?.[status] || STATUS_CONFIG.generic[status] || {
    color: 'text-white/50',
    bg: 'bg-white/10',
    border: 'border-white/10',
    label: status,
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={clsx(
      'rounded-lg font-medium',
      sizes[size],
      config.color,
      config.bg,
      showBorder && `border ${config.border}`
    )}>
      {customLabel || config.label}
    </span>
  );
}
