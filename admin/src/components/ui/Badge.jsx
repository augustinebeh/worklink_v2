import { clsx } from 'clsx';

const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

// Status mapping for common use cases
const statusVariants = {
  // Candidate statuses
  lead: 'neutral',
  applied: 'info',
  screening: 'warning',
  onboarding: 'info',
  active: 'success',
  inactive: 'neutral',
  
  // Job statuses
  draft: 'neutral',
  open: 'success',
  filled: 'info',
  cancelled: 'error',
  completed: 'success',
  
  // Payment statuses
  pending: 'warning',
  approved: 'info',
  paid: 'success',
  rejected: 'error',
  
  // Tender statuses
  new: 'info',
  reviewing: 'warning',
  bidding: 'info',
  submitted: 'info',
  won: 'success',
  lost: 'error',
  expired: 'neutral',
};

export default function Badge({ 
  children, 
  variant,
  status,
  dot = false,
  className,
  ...props 
}) {
  // Use status mapping if status prop is provided
  const resolvedVariant = status ? statusVariants[status] || 'neutral' : variant || 'neutral';

  return (
    <span 
      className={clsx('badge', variants[resolvedVariant], className)}
      {...props}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          resolvedVariant === 'success' && 'bg-emerald-500',
          resolvedVariant === 'warning' && 'bg-amber-500',
          resolvedVariant === 'error' && 'bg-red-500',
          resolvedVariant === 'info' && 'bg-blue-500',
          resolvedVariant === 'neutral' && 'bg-slate-500',
        )} />
      )}
      {children}
    </span>
  );
}

// Convenience components for common statuses
export function StatusBadge({ status }) {
  const labels = {
    // Candidate
    lead: 'Lead',
    applied: 'Applied',
    screening: 'Screening',
    onboarding: 'Onboarding',
    active: 'Active',
    inactive: 'Inactive',
    
    // Job
    draft: 'Draft',
    open: 'Open',
    filled: 'Filled',
    cancelled: 'Cancelled',
    completed: 'Completed',
    
    // Payment
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    rejected: 'Rejected',
    
    // Tender
    new: 'New',
    reviewing: 'Reviewing',
    bidding: 'Bidding',
    submitted: 'Submitted',
    won: 'Won',
    lost: 'Lost',
    expired: 'Expired',
  };

  return (
    <Badge status={status} dot>
      {labels[status] || status}
    </Badge>
  );
}
