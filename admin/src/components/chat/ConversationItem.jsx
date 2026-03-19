/**
 * Conversation Item Component
 * Renders a single conversation entry in the conversation list sidebar
 */

import { useState } from 'react';
import {
  User,
  MoreVertical,
  CheckCheck,
  Check,
  Flag,
} from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../ui/Badge';

// Parse DB timestamp (stored as UTC without timezone indicator)
export function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}

// Format last message time
export function formatLastMessageTime(timestamp) {
  const date = parseUTCTimestamp(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMins = Math.floor((now - date) / (1000 * 60));
    return diffInMins <= 1 ? 'now' : `${diffInMins}m`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h`;
  } else if (diffInHours < 48) {
    return 'yesterday';
  } else {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
  }
}

// Get status color for message read indicators
function getMessageStatusColor(status, type) {
  if (type === 'outgoing') {
    switch (status) {
      case 'sent': return 'text-gray-400';
      case 'delivered': return 'text-gray-600';
      case 'read': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  }
  return 'text-gray-400';
}

export default function ConversationItem({ conversation, isSelected, onClick, onMarkAsRead, onArchive, onFlag }) {
  const [showActions, setShowActions] = useState(false);

  const lastMessage = conversation.lastMessage;
  const hasUnread = conversation.unread_count > 0;
  const isEscalated = conversation.escalated;
  const priority = conversation.priority || 'normal';

  const priorityColors = {
    urgent: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    normal: '',
  };

  return (
    <div
      className={clsx(
        'p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 relative group',
        isSelected && 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500',
        priorityColors[priority],
        hasUnread && 'bg-blue-50/50 dark:bg-blue-900/10'
      )}
      onClick={onClick}
    >
      {/* Priority Indicator */}
      {priority !== 'normal' && (
        <div
          className={clsx(
            'absolute left-0 top-0 bottom-0 w-1',
            priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'
          )}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          {conversation.avatar ? (
            <img
              src={conversation.avatar}
              alt={conversation.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className={clsx(
                'text-sm font-medium truncate',
                hasUnread ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-700 dark:text-gray-300'
              )}>
                {conversation.name}
              </h3>

              {/* Status indicators */}
              {isEscalated && (
                <Flag className="h-4 w-4 text-red-500" />
              )}
              {conversation.is_ai_active && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="AI Active" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {lastMessage?.created_at && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatLastMessageTime(lastMessage.created_at)}
                </span>
              )}

              {/* Unread count */}
              {hasUnread && (
                <Badge variant="primary" size="sm">
                  {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </Badge>
              )}
            </div>
          </div>

          {/* Last Message */}
          {lastMessage && (
            <div className="flex items-center gap-2 mt-1">
              {/* Message status icons for outgoing messages */}
              {lastMessage.type === 'outgoing' && (
                <div className={getMessageStatusColor(lastMessage.status, lastMessage.type)}>
                  {lastMessage.status === 'read' ? (
                    <CheckCheck className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              )}

              <p className={clsx(
                'text-sm truncate',
                hasUnread ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'
              )}>
                {lastMessage.message || 'No message'}
              </p>
            </div>
          )}

          {/* Tags */}
          {conversation.tags && conversation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {conversation.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="secondary" size="xs">
                  {tag}
                </Badge>
              ))}
              {conversation.tags.length > 2 && (
                <Badge variant="secondary" size="xs">
                  +{conversation.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </button>

          {/* Actions Dropdown */}
          {showActions && (
            <div className="absolute right-2 top-12 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
              {hasUnread && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Mark as read
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFlag();
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isEscalated ? 'Remove flag' : 'Flag conversation'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
