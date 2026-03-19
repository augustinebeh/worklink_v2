import { useState } from 'react';
import {
  Check,
  CheckCheck,
  MessageSquare,
  Bot,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Download,
} from 'lucide-react';
import { clsx } from 'clsx';

// Parse DB timestamp (stored as UTC without timezone indicator)
export function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  // If timestamp doesn't end with Z, append it to indicate UTC
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}

// Format date for message grouping
function formatDateDivider(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);

  if (messageDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString('en-SG', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Singapore'
    });
  }
}

// Group messages by date
export function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;

  // Sort messages by created_at timestamp (oldest first), then by ID for stable ordering
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = parseUTCTimestamp(a.created_at).getTime();
    const timeB = parseUTCTimestamp(b.created_at).getTime();
    // Primary sort by timestamp
    if (timeA !== timeB) return timeA - timeB;
    // Secondary sort by ID (ensures messages with same timestamp are ordered by creation)
    return (a.id || 0) - (b.id || 0);
  });

  sortedMessages.forEach(msg => {
    const msgDate = parseUTCTimestamp(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ type: 'divider', date: msg.created_at });
    }
    groups.push({ type: 'message', message: msg });
  });

  return groups;
}

// Date divider component
function DateDivider({ date }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium">
        {formatDateDivider(date)}
      </div>
    </div>
  );
}

// File attachment in message
function MessageAttachment({ attachment }) {
  const isImage = attachment.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.url || attachment.filename);

  if (isImage) {
    return (
      <div className="mt-2">
        <img
          src={attachment.url}
          alt={attachment.filename || 'Attachment'}
          className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(attachment.url, '_blank')}
        />
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      download={attachment.filename}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
    >
      <FileText className="h-4 w-4" />
      <span className="text-sm truncate flex-1">{attachment.filename || 'Download file'}</span>
      <Download className="h-4 w-4" />
    </a>
  );
}

// Message bubble component
function MessageBubble({ message, isOwn, onFeedback, searchHighlight }) {
  const [feedbackGiven, setFeedbackGiven] = useState(message.admin_feedback || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const time = parseUTCTimestamp(message.created_at).toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Singapore'
  });

  const isAIGenerated = message.ai_generated === 1;
  const aiSource = message.ai_source;

  // Determine source label and color
  const getSourceInfo = () => {
    if (!aiSource) return { label: 'AI', color: 'text-white/70', bgColor: 'bg-white/20' };
    switch (aiSource) {
      case 'faq':
      case 'knowledge_base':
      case 'kb':
        return { label: 'KB', color: 'text-emerald-200', bgColor: 'bg-emerald-500/30' };
      case 'llm':
        return { label: 'LLM', color: 'text-violet-200', bgColor: 'bg-violet-500/30' };
      default:
        return { label: 'AI', color: 'text-white/70', bgColor: 'bg-white/20' };
    }
  };

  const handleFeedback = async (type) => {
    if (isSubmitting || feedbackGiven) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/ai-chat/feedback/${message.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: type }),
      });
      if (res.ok) {
        setFeedbackGiven(type);
        if (onFeedback) onFeedback(message.id, type);
      }
    } catch (e) {
      // Failed to submit feedback
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceInfo = getSourceInfo();

  // Highlight search matches in content
  const renderContent = () => {
    if (!searchHighlight || !message.content) {
      return <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>;
    }

    const regex = new RegExp(`(${searchHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = message.content.split(regex);

    return (
      <p className="whitespace-pre-wrap break-words text-sm">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-inherit rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </p>
    );
  };

  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start', 'mb-3')}>
      <div className={clsx(
        'max-w-[70%] px-4 py-2.5 rounded-2xl',
        isOwn
          ? 'bg-primary-700 text-white rounded-br-sm'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-sm'
      )}>
        {isAIGenerated && isOwn && (
          <div className="flex items-center gap-1.5 mb-1">
            <Bot className="h-3 w-3 text-white/70" />
            <span className={clsx('text-xs px-1.5 py-0.5 rounded', sourceInfo.bgColor, sourceInfo.color)}>
              {sourceInfo.label === 'KB' ? '📚 KB (Free)' : '🤖 LLM'}
            </span>
          </div>
        )}
        {renderContent()}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2">
            {message.attachments.map((att, idx) => (
              <MessageAttachment key={idx} attachment={att} />
            ))}
          </div>
        )}

        {/* Feedback buttons for AI messages */}
        {isAIGenerated && isOwn && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
            {feedbackGiven ? (
              <span className={clsx(
                'text-xs px-2 py-1 rounded-full',
                feedbackGiven === 'positive' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-red-500/30 text-red-200'
              )}>
                {feedbackGiven === 'positive' ? '👍 Boosted' : '👎 Reduced'}
              </span>
            ) : (
              <>
                <span className="text-xs text-white/50">Rate:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedback('positive');
                  }}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-emerald-300 transition-colors cursor-pointer"
                  title="Good response - boost confidence"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedback('negative');
                  }}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-red-300 transition-colors cursor-pointer"
                  title="Bad response - reduce confidence"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}

        <div className={clsx('flex items-center gap-1.5 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
          <span className={clsx('text-xs', isOwn ? 'text-white/70' : 'text-slate-400')}>
            {time}
          </span>
          {message.channel === 'telegram' && (
            <span className={clsx('text-xs', isOwn ? 'text-white/50' : 'text-slate-400')}>
              via Telegram
            </span>
          )}
          {isOwn && (
            <>
              {message.read ? (
                <span className="flex items-center gap-1">
                  <CheckCheck className="h-3.5 w-3.5 text-white/70" />
                  {message.read_at && (
                    <span className="text-xs text-white/50">
                      Seen {parseUTCTimestamp(message.read_at).toLocaleTimeString('en-SG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Singapore'
                      })}
                    </span>
                  )}
                </span>
              ) : (
                <Check className="h-3.5 w-3.5 text-white/50" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ChatMessageList - Displays messages grouped by date with scroll support
 */
export default function ChatMessageList({
  messages,
  messageSearchQuery,
  messagesEndRef,
}) {
  // Filter messages based on search query
  const filteredMessages = messageSearchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
    : messages;

  // Group messages by date
  const groupedMessages = groupMessagesByDate(filteredMessages);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {filteredMessages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400">
          <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">
            {messageSearchQuery ? 'No messages match your search' : 'No messages yet'}
          </p>
          {!messageSearchQuery && (
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          )}
        </div>
      ) : (
        groupedMessages.map((item, idx) => (
          item.type === 'divider' ? (
            <DateDivider key={`divider-${idx}`} date={item.date} />
          ) : (
            <MessageBubble
              key={item.message.id}
              message={item.message}
              isOwn={item.message.sender === 'admin'}
              searchHighlight={messageSearchQuery}
            />
          )
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
