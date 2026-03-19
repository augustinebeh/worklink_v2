import { useState } from 'react';
import {
  Search,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Clock,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import Badge from '../ui/Badge';
import { clsx } from 'clsx';
import { parseUTCTimestamp } from './ChatMessageList';

// Priority indicator component
function PriorityIndicator({ priority }) {
  const colors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    normal: 'bg-slate-300 dark:bg-slate-600',
  };

  return (
    <span
      className={clsx('w-2.5 h-2.5 rounded-full', colors[priority] || colors.normal)}
      title={`Priority: ${priority || 'normal'}`}
    />
  );
}

// Status badge component
function StatusBadge({ status }) {
  const variants = {
    open: { variant: 'primary', icon: MessageSquare },
    pending: { variant: 'warning', icon: Clock },
    resolved: { variant: 'success', icon: CheckCircle2 },
  };

  const config = variants[status] || variants.open;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} size="xs" className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Open'}
    </Badge>
  );
}

// Escalation badge component (also exported for use in chat header)
export function EscalationBadge({ escalated, reason }) {
  if (!escalated) return null;

  return (
    <div className="relative group">
      <Badge variant="danger" size="xs" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Escalated
      </Badge>
      {reason && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {reason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

// Sidebar filter dropdown
function SidebarFilterDropdown({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <span className="text-slate-500 dark:text-slate-400">{label}:</span>
        <span className="text-slate-700 dark:text-slate-300">{currentOption.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[100px]">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                  value === option.value && 'bg-slate-50 dark:bg-slate-700/50 font-medium'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Conversation item in sidebar
function ConversationItem({ conversation, active, onClick, collapsed }) {
  const isOnline = conversation.online_status === 'online';

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className={clsx(
          'w-full p-3 flex items-center justify-center transition-colors relative',
          active ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
        )}
        title={conversation.name}
      >
        <div className="relative">
          {conversation.profile_photo ? (
            <img
              src={conversation.profile_photo}
              alt={conversation.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {conversation.name?.charAt(0)}
              </span>
            </div>
          )}
          <span className={clsx(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
          )} />
        </div>
        {conversation.unread_count > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {conversation.unread_count}
          </span>
        )}
        {conversation.escalated && (
          <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
            <AlertTriangle className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full p-3 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800',
        active ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
      )}
    >
      <div className="relative flex-shrink-0">
        {conversation.profile_photo ? (
          <img
            src={conversation.profile_photo}
            alt={conversation.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
              {conversation.name?.charAt(0)}
            </span>
          </div>
        )}
        <span className={clsx(
          'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900',
          isOnline ? 'bg-emerald-500' : 'bg-slate-300'
        )} />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PriorityIndicator priority={conversation.priority} />
            <span className="font-medium text-slate-900 dark:text-white truncate">
              {conversation.name}
            </span>
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {conversation.last_message_at
              ? parseUTCTimestamp(conversation.last_message_at).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' })
              : ''
            }
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={conversation.status} />
          {conversation.escalated && (
            <EscalationBadge escalated={true} reason={conversation.escalation_reason} />
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {conversation.last_message_sender === 'admin' && (
              <span className="text-slate-400">You: </span>
            )}
            {conversation.last_message || 'No messages yet'}
          </p>
          {conversation.unread_count > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * ChatSidebar - Conversation list sidebar with search, filters, and new chat modal
 */
export default function ChatSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  sidebarCollapsed,
  setSidebarCollapsed,
  loading,
  isConnected,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  onShowNewChat,
}) {
  // Filter conversations based on search, status, and priority
  const filteredConversations = conversations
    .filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => priorityFilter === 'all' || c.priority === priorityFilter)
    .sort((a, b) => {
      // Escalated first
      if (a.escalated && !b.escalated) return -1;
      if (!a.escalated && b.escalated) return 1;
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, normal: 2 };
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Then by last message time
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });

  return (
    <div className={clsx(
      'flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 transition-all duration-300',
      sidebarCollapsed ? 'w-[72px]' : 'w-80'
    )}>
      {/* Header */}
      <div className={clsx(
        'border-b border-slate-200 dark:border-slate-800 flex-shrink-0',
        sidebarCollapsed ? 'p-3' : 'p-4'
      )}>
        {!sidebarCollapsed && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Messages</h2>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-emerald-500' : 'bg-red-500'
                )} />
                <button
                  onClick={onShowNewChat}
                  className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <SidebarFilterDropdown
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'open', label: 'Open' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'resolved', label: 'Resolved' },
                ]}
              />
              <SidebarFilterDropdown
                label="Priority"
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'normal', label: 'Normal' },
                ]}
              />
            </div>
          </>
        )}
        {sidebarCollapsed && (
          <button
            onClick={onShowNewChat}
            className="w-full p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center justify-center"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {!sidebarCollapsed && <p>No conversations yet</p>}
          </div>
        ) : (
          filteredConversations.map(conv => (
            <ConversationItem
              key={conv.candidate_id}
              conversation={conv}
              active={selectedConversation?.candidate_id === conv.candidate_id}
              onClick={() => onSelectConversation(conv)}
              collapsed={sidebarCollapsed}
            />
          ))
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Collapse</span>
          </>
        )}
      </button>
    </div>
  );
}
