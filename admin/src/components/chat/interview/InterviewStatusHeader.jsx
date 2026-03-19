import {
  Calendar,
  Clock,
  CheckCircle2,
  Video,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../../ui/Badge';

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
