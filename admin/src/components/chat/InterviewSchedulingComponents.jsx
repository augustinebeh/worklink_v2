import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Video,
  Phone,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  User,
  Mail,
  MessageSquare,
  TrendingUp,
  Activity,
  Eye,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../ui/Badge';

/**
 * Interview Status Header - Shows in chat header when candidate is in scheduling flow
 */
export function InterviewStatusHeader({
  candidateId,
  interviewData,
  onSchedule,
  onReschedule,
  onCancel,
  onViewDetails,
  className = ''
}) {
  const getStatusBadge = (stage, status) => {
    switch (stage) {
      case 'interview_scheduled':
        return (
          <Badge variant="primary" size="sm" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Scheduled
          </Badge>
        );
      case 'interview_confirmed':
        return (
          <Badge variant="success" size="sm" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Confirmed
          </Badge>
        );
      case 'in_queue':
        return (
          <Badge variant="warning" size="sm" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            In Queue
          </Badge>
        );
      case 'in_conversation':
        return (
          <Badge variant="info" size="sm" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            In SLM Chat
          </Badge>
        );
      default:
        return null;
    }
  };

  const interview = interviewData?.interview;
  const stage = interviewData?.schedulingStage;

  return (
    <div className={clsx(
      'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Interview Scheduling
              </span>
              {getStatusBadge(stage, interview?.status)}
            </div>

            {interview ? (
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {interview.displayTime?.date || new Date(interview.scheduled_date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {interview.duration_minutes || 30}min
                </span>
                {interview.interview_type && (
                  <span className="capitalize">{interview.interview_type}</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {stage === 'in_queue' ? 'Waiting for slot assignment' : 'In scheduling conversation'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!interview && onSchedule && (
            <button
              onClick={onSchedule}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Schedule
            </button>
          )}

          {interview && (
            <>
              <button
                onClick={onViewDetails}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>

              <div className="relative group">
                <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {onReschedule && (
                    <button
                      onClick={onReschedule}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 first:rounded-t-lg"
                    >
                      <Edit className="h-3 w-3" />
                      Reschedule
                    </button>
                  )}

                  {interview?.meeting_link && (
                    <a
                      href={interview.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Join Call
                    </a>
                  )}

                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 last:rounded-b-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Interview Details Panel - Detailed view of interview information
 */
export function InterviewDetailsPanel({
  interview,
  candidate,
  onClose,
  onUpdateStatus,
  onReschedule,
  onCancel,
  className = ''
}) {
  const [notes, setNotes] = useState(interview?.notes || '');
  const [isEditing, setIsEditing] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800';
      case 'scheduled':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800';
      case 'no_show':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-600';
    }
  };

  const handleStatusUpdate = (newStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(interview.id, newStatus, notes);
    }
  };

  const handleSaveNotes = () => {
    if (onUpdateStatus) {
      onUpdateStatus(interview.id, interview.status, notes);
    }
    setIsEditing(false);
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Interview Details
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {candidate?.name || 'Unknown Candidate'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Status:
          </span>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium border capitalize',
              getStatusColor(interview.status)
            )}>
              {interview.status?.replace('_', ' ') || 'Scheduled'}
            </span>

            {interview.status === 'scheduled' && (
              <button
                onClick={() => handleStatusUpdate('confirmed')}
                className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                Mark Confirmed
              </button>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Date & Time
            </label>
            <div className="text-sm text-slate-900 dark:text-white">
              {interview.displayTime?.full || `${interview.scheduled_date} at ${interview.scheduled_time}`}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Duration
            </label>
            <div className="text-sm text-slate-900 dark:text-white">
              {interview.duration_minutes || 30} minutes
            </div>
          </div>
        </div>

        {/* Type & Meeting Link */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Interview Type
            </label>
            <div className="text-sm text-slate-900 dark:text-white capitalize">
              {interview.interview_type || 'Onboarding'}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Meeting Link
            </label>
            {interview.meeting_link ? (
              <a
                href={interview.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Join Meeting
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Not available
              </div>
            )}
          </div>
        </div>

        {/* Candidate Info */}
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
          <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            Candidate Information
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Name:</span>
              <div className="text-slate-900 dark:text-white">{candidate?.name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Email:</span>
              <div className="text-slate-900 dark:text-white">{candidate?.email || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Phone:</span>
              <div className="text-slate-900 dark:text-white">{candidate?.phone || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Status:</span>
              <div className="text-slate-900 dark:text-white capitalize">{candidate?.status || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setNotes(interview?.notes || '');
                    setIsEditing(false);
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add notes about the interview..."
            />
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 min-h-[60px]">
              {notes || 'No notes added yet.'}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          {interview.status === 'scheduled' && (
            <>
              <button
                onClick={() => handleStatusUpdate('completed')}
                className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </button>

              <button
                onClick={onReschedule}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Reschedule
              </button>

              <button
                onClick={onCancel}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Cancel
              </button>
            </>
          )}

          {interview.status === 'confirmed' && (
            <button
              onClick={() => handleStatusUpdate('completed')}
              className="flex-1 bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Scheduling Quick Actions - Floating action buttons
 */
export function SchedulingQuickActions({
  candidateId,
  onScheduleInterview,
  onViewQueue,
  onViewAnalytics,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={clsx('relative', className)}>
      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center',
          isOpen && 'rotate-45'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Action Menu */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 space-y-2">
          <button
            onClick={() => {
              onScheduleInterview?.();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
          >
            <Calendar className="h-4 w-4" />
            Schedule Interview
          </button>

          <button
            onClick={() => {
              onViewQueue?.();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            View Queue
          </button>

          <button
            onClick={() => {
              onViewAnalytics?.();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </button>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Interview Timeline - Shows progression through scheduling stages
 */
export function InterviewTimeline({
  stages = [],
  currentStage,
  className = ''
}) {
  const defaultStages = [
    { id: 'contact', label: 'Initial Contact', icon: MessageSquare },
    { id: 'queue', label: 'Added to Queue', icon: Clock },
    { id: 'scheduled', label: 'Interview Scheduled', icon: Calendar },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { id: 'completed', label: 'Interview Complete', icon: CheckCircle2 }
  ];

  const timelineStages = stages.length > 0 ? stages : defaultStages;
  const currentIndex = timelineStages.findIndex(stage => stage.id === currentStage);

  return (
    <div className={clsx('space-y-4', className)}>
      <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Interview Progress
      </h4>

      <div className="space-y-3">
        {timelineStages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.id} className="flex items-center gap-3">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                isCurrent && 'bg-blue-500 border-blue-500 text-white',
                isPending && 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1">
                <div className={clsx(
                  'text-sm font-medium',
                  isCompleted && 'text-emerald-600 dark:text-emerald-400',
                  isCurrent && 'text-blue-600 dark:text-blue-400',
                  isPending && 'text-slate-500 dark:text-slate-400'
                )}>
                  {stage.label}
                </div>
                {stage.timestamp && (
                  <div className="text-xs text-slate-400">
                    {new Date(stage.timestamp).toLocaleString()}
                  </div>
                )}
              </div>

              {isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * SLM Activity Indicator - Shows when SLM is handling scheduling
 */
export function SLMActivityIndicator({
  isActive,
  activityType,
  lastActivity,
  className = ''
}) {
  const getActivityInfo = (type) => {
    switch (type) {
      case 'scheduling_conversation':
        return {
          icon: MessageSquare,
          label: 'SLM handling scheduling',
          color: 'text-purple-600 bg-purple-50 border-purple-200'
        };
      case 'collecting_availability':
        return {
          icon: Calendar,
          label: 'Collecting availability',
          color: 'text-blue-600 bg-blue-50 border-blue-200'
        };
      case 'confirming_booking':
        return {
          icon: CheckCircle2,
          label: 'Confirming booking',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
        };
      default:
        return {
          icon: Zap,
          label: 'SLM active',
          color: 'text-amber-600 bg-amber-50 border-amber-200'
        };
    }
  };

  if (!isActive) return null;

  const activityInfo = getActivityInfo(activityType);
  const Icon = activityInfo.icon;

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      activityInfo.color,
      className
    )}>
      <div className="relative">
        <Icon className="h-4 w-4" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {activityInfo.label}
        </div>
        {lastActivity && (
          <div className="text-xs opacity-75">
            Last activity: {new Date(lastActivity).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage interview scheduling state for admin interface
 */
export function useAdminInterviewScheduling() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCandidateStatus = async (candidateId) => {
    if (!candidateId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/interview-scheduling/candidate/${candidateId}/status`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch interview status');
      }
    } catch (err) {
      setError('Failed to fetch interview status');
      console.error('Interview status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async (candidateId, date, time, notes = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/candidate/${candidateId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time, notes }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchCandidateStatus(candidateId); // Refresh status
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to schedule interview');
      }
    } catch (err) {
      console.error('Schedule interview error:', err);
      throw err;
    }
  };

  const updateInterviewStatus = async (interviewId, status, notes = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/interview/${interviewId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          notes,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update interview status');
      }
    } catch (err) {
      console.error('Update interview status error:', err);
      throw err;
    }
  };

  const rescheduleInterview = async (interviewId, date, time, reason = '') => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/interview/${interviewId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, time, reason }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to reschedule interview');
      }
    } catch (err) {
      console.error('Reschedule interview error:', err);
      throw err;
    }
  };

  const fetchAnalytics = async (days = 7) => {
    try {
      const response = await fetch(`/api/v1/interview-scheduling/analytics?days=${days}`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
      throw err;
    }
  };

  return {
    status,
    loading,
    error,
    fetchCandidateStatus,
    scheduleInterview,
    updateInterviewStatus,
    rescheduleInterview,
    fetchAnalytics,
  };
}