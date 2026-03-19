/**
 * Conversation List Component
 * Orchestrator that composes ConversationSearch and ConversationItem sub-components
 */

import { useState, useEffect, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAdminWebSocket } from '../../contexts/WebSocketContext';
import ConversationSearch from './ConversationSearch';
import ConversationItem, { parseUTCTimestamp } from './ConversationItem';

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
      // Failed to load conversations
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
      // Failed to mark as read
    }
  };

  const handleArchive = async (conversationId) => {
    try {
      await fetch(`/api/v1/admin/conversations/${conversationId}/archive`, {
        method: 'POST',
      });
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (error) {
      // Failed to archive conversation
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
      // Failed to toggle flag
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
      {/* Header with Search and Filters */}
      <ConversationSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterPriority={filterPriority}
        onFilterPriorityChange={setFilterPriority}
        conversationCount={filteredConversations.length}
      />

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
