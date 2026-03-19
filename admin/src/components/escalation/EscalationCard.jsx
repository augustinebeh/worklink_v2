import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  User,
  Eye,
  MoreVertical,
  UserPlus,
  MessageSquare,
  Edit3,
  CheckCircle2
} from 'lucide-react';
import { clsx } from 'clsx';
import { PriorityIndicator, StatusBadge, TimeSince, SLAIndicator } from './EscalationHelpers';

export default function EscalationCard({ escalation, onAssign, onViewDetails, onUpdateStatus, isSelected, onSelect }) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const candidate = escalation.context_data?.candidate || {};

  return (
    <div className={clsx(
      'p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer',
      isSelected
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
      escalation.sla_breached && 'ring-2 ring-red-500'
    )} onClick={() => onSelect(escalation)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {candidate.profile_photo ? (
              <img
                src={candidate.profile_photo}
                alt={candidate.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {(candidate.name || 'U').charAt(0)}
                </span>
              </div>
            )}
            {escalation.priority === 'CRITICAL' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {candidate.name || 'Unknown User'}
              </h3>
              <PriorityIndicator priority={escalation.priority} size="sm" />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
              {escalation.trigger_reason}
            </p>

            <div className="flex items-center gap-4 text-xs">
              <StatusBadge status={escalation.status} />
              <TimeSince date={escalation.created_at} />
              {escalation.assigned_admin && (
                <div className="flex items-center gap-1 text-slate-500">
                  <User className="h-3 w-3" />
                  {escalation.assigned_admin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" ref={actionsRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(escalation);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px]">
                  {escalation.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssign(escalation);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(escalation, 'in_progress');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Start Work
                  </button>

                  {['assigned', 'in_progress'].includes(escalation.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(escalation, 'resolved');
                        setShowActions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const candidateId = escalation.candidate_id;
                      window.open(`/admin/chat?candidate=${candidateId}`, '_blank');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Open Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SLA indicator */}
      <div className="flex items-center justify-between">
        <SLAIndicator escalation={escalation} />
        <div className="text-xs text-slate-400">
          #{escalation.id}
        </div>
      </div>
    </div>
  );
}
