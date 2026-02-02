import { useState } from 'react';
import { AlertTriangle, MessageSquare, Clock, CheckCircle, Phone, User } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * EscalationButton Component
 *
 * Provides workers with an easy way to request human support when needed.
 * Features contextual messaging and clear expectations about response times.
 */
export default function EscalationButton({
  candidateId,
  context = {},
  onEscalationRequested,
  className = '',
  variant = 'default' // 'default', 'chat', 'urgent'
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [escalationStatus, setEscalationStatus] = useState(null);

  const escalationReasons = [
    {
      id: 'payment_issue',
      label: 'Payment or Salary Issue',
      description: 'Issues with payments, missing salary, or payment amounts',
      priority: 'URGENT',
      icon: '💰'
    },
    {
      id: 'account_access',
      label: 'Account Access Problem',
      description: 'Cannot login, verification issues, or account locked',
      priority: 'HIGH',
      icon: '🔐'
    },
    {
      id: 'job_assignment',
      label: 'Job Assignment Issue',
      description: 'Problems with job assignments or deployment status',
      priority: 'NORMAL',
      icon: '💼'
    },
    {
      id: 'technical_problem',
      label: 'Technical Problem',
      description: 'App not working, bugs, or system errors',
      priority: 'HIGH',
      icon: '🛠️'
    },
    {
      id: 'urgent_personal',
      label: 'Urgent Personal Matter',
      description: 'Emergency or time-sensitive personal issue',
      priority: 'URGENT',
      icon: '⚡'
    },
    {
      id: 'general_support',
      label: 'General Support',
      description: 'Other questions or support needs',
      priority: 'NORMAL',
      icon: '💬'
    }
  ];

  const handleEscalationRequest = async () => {
    if (!selectedReason && !customReason.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const reason = selectedReason
        ? escalationReasons.find(r => r.id === selectedReason)?.label + (customReason ? ': ' + customReason : '')
        : customReason;

      const priority = selectedReason
        ? escalationReasons.find(r => r.id === selectedReason)?.priority || 'NORMAL'
        : 'NORMAL';

      const res = await fetch('/api/v1/admin-escalation/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          reason,
          additionalContext: {
            ...context,
            selectedReasonId: selectedReason,
            priority,
            source: 'worker_app',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await res.json();

      if (data.success) {
        setEscalationStatus('success');
        if (onEscalationRequested) {
          onEscalationRequested(data.data);
        }
      } else {
        setEscalationStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit escalation request:', error);
      setEscalationStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'chat':
        return (
          <>
            <User className="h-4 w-4" />
            Talk to Human
          </>
        );
      case 'urgent':
        return (
          <>
            <AlertTriangle className="h-4 w-4" />
            Need Urgent Help
          </>
        );
      default:
        return (
          <>
            <MessageSquare className="h-4 w-4" />
            Get Human Support
          </>
        );
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'urgent':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'chat':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      default:
        return 'bg-primary-500 hover:bg-primary-600 text-white';
    }
  };

  if (escalationStatus === 'success') {
    return (
      <div className={clsx(
        'p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
        className
      )}>
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-medium text-green-900 dark:text-green-100">
              Support Request Submitted
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              A human support agent will contact you shortly. We'll respond within our SLA guidelines.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
          getButtonVariant(),
          className
        )}
      >
        {getButtonContent()}
      </button>

      {/* Escalation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Request Human Support
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Get help from our support team
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {escalationStatus === 'error' ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    Request Failed
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    We couldn't submit your support request. Please try again.
                  </p>
                  <button
                    onClick={() => setEscalationStatus(null)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Response Time Expectation */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-100">
                          Expected Response Times
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          • Urgent issues: Within 15 minutes<br />
                          • General support: Within 4 hours<br />
                          • Non-urgent: Within 24 hours
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                      What do you need help with?
                    </h3>
                    <div className="space-y-3">
                      {escalationReasons.map((reason) => (
                        <label
                          key={reason.id}
                          className={clsx(
                            'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                            selectedReason === reason.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          )}
                        >
                          <input
                            type="radio"
                            name="escalation-reason"
                            value={reason.id}
                            checked={selectedReason === reason.id}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="mt-1 text-primary-500 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{reason.icon}</span>
                              <h4 className="font-medium text-slate-900 dark:text-white">
                                {reason.label}
                              </h4>
                              <span className={clsx(
                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                reason.priority === 'URGENT'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                  : reason.priority === 'HIGH'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              )}>
                                {reason.priority}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {reason.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom Reason */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Additional Details {selectedReason ? '(Optional)' : '(Required)'}
                    </label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder={
                        selectedReason
                          ? "Any additional details about your issue..."
                          : "Please describe your issue or question..."
                      }
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>

                  {/* Contact Preferences */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                      How we'll contact you:
                    </h4>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>In-app message (fastest)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>Phone call for urgent issues</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {escalationStatus !== 'error' && (
              <div className="p-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEscalationRequest}
                    disabled={isSubmitting || (!selectedReason && !customReason.trim())}
                    className={clsx(
                      'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors',
                      (!selectedReason && !customReason.trim()) || isSubmitting
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        Request Support
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}