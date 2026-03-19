import { forwardRef } from 'react';
import { SendIcon } from 'lucide-react';
import { MessageBubble, DateDivider, TypingIndicator } from '../chat';
import {
  InterviewOfferCard,
  AvailabilitySelector,
  InterviewConfirmation,
  SchedulingStatusIndicator,
} from '../chat/InterviewSchedulingComponents';

/**
 * WorkerMessageList - Message display area for the worker chat page
 *
 * Renders:
 * - Loading spinner
 * - Empty state prompt
 * - Grouped messages by date with DateDividers
 * - Typing indicator
 * - Interview scheduling components (offer card, availability selector, confirmation)
 */
const WorkerMessageList = forwardRef(({
  loading,
  messages,
  groupedMessages,
  isTyping,
  // Interview scheduling props
  selectedSlot,
  pendingInterviewOffer,
  showAvailabilitySelector,
  availableSlots,
  slotsLoading,
  interviewStatus,
  onInterviewOfferAccept,
  onInterviewOfferDecline,
  onInterviewOfferViewAvailability,
  onAvailabilitySlotSelect,
  onAvailabilityCancel,
  onInterviewReschedule,
  onAddToCalendar,
}, ref) => {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <SendIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-white font-medium">Start a conversation</p>
          <p className="text-white/40 text-sm mt-1">Send a message to WorkLink support</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <DateDivider date={date} />
              <div className="space-y-3">
                {msgs.map(msg => (
                  <MessageBubble key={msg.id} message={msg} isOwn={msg.sender === 'candidate'} />
                ))}
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}

          {/* Interview Scheduling Components */}
          {selectedSlot && pendingInterviewOffer && (
            <InterviewOfferCard
              offer={pendingInterviewOffer}
              selectedSlot={selectedSlot}
              onAccept={onInterviewOfferAccept}
              onDecline={onInterviewOfferDecline}
              onViewAvailability={onInterviewOfferViewAvailability}
              showOnlyAfterSlotSelection={true}
            />
          )}

          {showAvailabilitySelector && (
            <AvailabilitySelector
              availableSlots={availableSlots}
              onSelectSlot={onAvailabilitySlotSelect}
              onCancel={onAvailabilityCancel}
              loading={slotsLoading}
            />
          )}

          {interviewStatus?.interview && interviewStatus.schedulingStage === 'interview_scheduled' && (
            <InterviewConfirmation
              interview={interviewStatus.interview}
              onReschedule={onInterviewReschedule}
              onAddToCalendar={() => onAddToCalendar(interviewStatus.interview)}
            />
          )}

          <div ref={ref} />
        </div>
      )}
    </div>
  );
});

WorkerMessageList.displayName = 'WorkerMessageList';

export default WorkerMessageList;
