/**
 * Conversation List Component
 * Displays and manages the list of chat conversations in the sidebar
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MessageSquare,
  User,
  Clock,
  Filter,
  MoreVertical,
  CheckCheck,
  Check,
  AlertTriangle,
  Flag,
  Archive,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import { useAdminWebSocket } from '../../contexts/WebSocketContext';

// Parse DB timestamp (stored as UTC without timezone indicator)
function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}

// Format last message time
function formatLastMessageTime(timestamp) {
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

/**
 * Individual Conversation Item
 */
function ConversationItem({ conversation, isSelected, onClick, onMarkAsRead, onArchive, onFlag }) {
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

/**
 * Main Conversation List Component
 */
export default function ConversationList({ selectedId, onSelect, isMobile }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const { isConnected, unreadCounts } = useAdminWebSocket();

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Update unread counts from WebSocket
  useEffect(() => {
    if (unreadCounts) {
      setConversations(prev => prev.map(conv => ({
        ...conv,
        unread_count: unreadCounts[conv.id] || 0
      })));
    }
  }, [unreadCounts]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/admin/conversations');
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = conversation.name?.toLowerCase().includes(query);
        const matchesLastMessage = conversation.lastMessage?.message?.toLowerCase().includes(query);
        if (!matchesName && !matchesLastMessage) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        switch (filterStatus) {
          case 'unread':
            if (!conversation.unread_count) return false;
            break;
          case 'escalated':
            if (!conversation.escalated) return false;
            break;
          case 'ai_active':
            if (!conversation.is_ai_active) return false;
            break;
        }
      }

      // Priority filter
      if (filterPriority !== 'all') {
        if (conversation.priority !== filterPriority) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by last message time (most recent first)
      const timeA = parseUTCTimestamp(a.lastMessage?.created_at || a.updated_at).getTime();
      const timeB = parseUTCTimestamp(b.lastMessage?.created_at || b.updated_at).getTime();
      return timeB - timeA;
    });
  }, [conversations, searchQuery, filterStatus, filterPriority]);

  // Handle conversation actions
  const handleMarkAsRead = async (conversationId) => {
    try {
      await fetch(`/api/v1/admin/conversations/${conversationId}/read`, {
        method: 'POST',
      });
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleArchive = async (conversationId) => {
    try {
      await fetch(`/api/v1/admin/conversations/${conversationId}/archive`, {
        method: 'POST',
      });
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const handleFlag = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    try {
      await fetch(`/api/v1/admin/conversations/${conversationId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalated: !conversation.escalated }),
      });
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, escalated: !conv.escalated } : conv
      ));
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Messages
          </h2>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredConversations.length}
            </div>
            <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
          className="mb-3"
        />

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="escalated">Escalated</option>
            <option value="ai_active">AI Active</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Try adjusting your search terms' : 'New conversations will appear here'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation.id)}
              onMarkAsRead={() => handleMarkAsRead(conversation.id)}
              onArchive={() => handleArchive(conversation.id)}
              onFlag={() => handleFlag(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}