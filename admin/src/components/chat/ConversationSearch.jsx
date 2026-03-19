/**
 * Conversation Search Component
 * Search bar and filter controls for the conversation list
 */

import {
  Search,
  MessageSquare,
} from 'lucide-react';
import Input from '../ui/Input';

export default function ConversationSearch({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  filterPriority,
  onFilterPriorityChange,
  conversationCount
}) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Messages
        </h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {conversationCount}
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
        onChange={(e) => onSearchChange(e.target.value)}
        icon={Search}
        className="mb-3"
      />

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="escalated">Escalated</option>
          <option value="ai_active">AI Active</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => onFilterPriorityChange(e.target.value)}
          className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>
      </div>
    </div>
  );
}
