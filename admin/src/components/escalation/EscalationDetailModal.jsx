import {
  MessageSquare,
  UserPlus,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { PriorityIndicator, StatusBadge, SLAIndicator } from './EscalationHelpers';

export default function EscalationDetailModal({
  isOpen,
  onClose,
  escalation,
  onAssign,
  onUpdateStatus
}) {
  if (!escalation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Escalation #${escalation.id}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PriorityIndicator priority={escalation.priority} />
            <StatusBadge status={escalation.status} />
            <SLAIndicator escalation={escalation} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                const candidateId = escalation.candidate_id;
                window.open(`/admin/chat?candidate=${candidateId}`, '_blank');
              }}
              variant="outline"
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Chat
            </Button>
          </div>
        </div>

        {/* Candidate Info */}
        {escalation.context_data?.candidate && (
          <Card padding="md">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Candidate Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="font-medium">{escalation.context_data.candidate.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <p className="font-medium">{escalation.context_data.candidate.email}</p>
              </div>
              <div>
                <span className="text-slate-500">Level:</span>
                <p className="font-medium">{escalation.context_data.candidate.level || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>
                <p className="font-medium">{escalation.context_data.candidate.status || 'N/A'}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Escalation Details */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Escalation Details
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-500">Reason:</span>
              <p className="mt-1">{escalation.trigger_reason}</p>
            </div>
            <div>
              <span className="text-slate-500">Trigger Type:</span>
              <p className="mt-1 font-mono text-xs">{escalation.trigger_type}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500">Created:</span>
                <p className="mt-1">{new Date(escalation.created_at).toLocaleString()}</p>
              </div>
              {escalation.assigned_at && (
                <div>
                  <span className="text-slate-500">Assigned:</span>
                  <p className="mt-1">{new Date(escalation.assigned_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Recent Messages */}
        {escalation.context_data?.recentMessages && (
          <Card padding="md">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Recent Messages
            </h3>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {escalation.context_data.recentMessages.slice(0, 5).map((msg, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-medium">{msg.sender}</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{msg.content}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          {escalation.status === 'pending' && (
            <Button
              onClick={() => {
                onAssign(escalation);
                onClose();
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign to Me
            </Button>
          )}

          {['assigned', 'in_progress'].includes(escalation.status) && (
            <Button
              onClick={() => {
                onUpdateStatus(escalation, 'resolved');
                onClose();
              }}
              variant="success"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          )}

          <Button
            onClick={() => {
              onUpdateStatus(escalation, 'in_progress');
              onClose();
            }}
            variant="outline"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Start Work
          </Button>
        </div>
      </div>
    </Modal>
  );
}
