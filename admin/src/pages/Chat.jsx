import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Send,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  Circle,
  Clock,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Zap,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

// Message bubble component
function MessageBubble({ message, isOwn }) {
  const time = new Date(message.created_at).toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Show channel indicator for telegram messages
  const channelBadge = message.channel === 'telegram' && (
    <span className="text-xs opacity-50 ml-1">via Telegram</span>
  );

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
        isOwn
          ? 'bg-primary-600 text-white rounded-br-md'
          : 'bg-dark-700 text-white rounded-bl-md'
      }`}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs opacity-60">{time}</span>
          {channelBadge}
          {isOwn && (
            message.read
              ? <CheckCheck className="h-3 w-3 text-blue-300" />
              : <Check className="h-3 w-3 opacity-60" />
          )}
        </div>
      </div>
    </div>
  );
}

// Conversation item in sidebar
function ConversationItem({ conversation, active, onClick }) {
  const isOnline = conversation.online_status === 'online';
  const lastSeen = conversation.last_seen
    ? new Date(conversation.last_seen).toLocaleString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short'
      })
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 hover:bg-dark-700/50 transition-colors ${
        active ? 'bg-dark-700' : ''
      }`}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        {conversation.profile_photo ? (
          <img
            src={conversation.profile_photo}
            alt={conversation.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-lg font-semibold text-white">{conversation.name?.charAt(0)}</span>
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-800 ${
          isOnline ? 'bg-green-500' : 'bg-gray-500'
        }`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium text-white truncate">{conversation.name}</span>
          <span className="text-xs text-dark-400">
            {conversation.last_message_at
              ? new Date(conversation.last_message_at).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
              : ''
            }
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm text-dark-400 truncate">
            {conversation.last_message_sender === 'admin' && <span className="text-dark-500">You: </span>}
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

// Quick reply chip component
function QuickReplyChip({ template, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-dark-700 hover:bg-dark-600 text-sm text-white transition-colors whitespace-nowrap"
    >
      {template.name}
    </button>
  );
}

export default function AdminChat() {
  const [conversations, setConversations] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);
  // Use ref to track selected conversation for WebSocket callback
  const selectedConversationRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Fetch initial data
  useEffect(() => {
    fetchConversations();
    fetchCandidates();
    fetchTemplates();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.candidate_id);
    }
  }, [selectedConversation]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?admin=true`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Admin WebSocket connected');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data.type, data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket connected as admin');
        break;

      case 'new_message':
        // New message from candidate (including Telegram)
        console.log('New message received:', data);
        setMessages(prev => {
          // Use ref to get current selected conversation
          const currentConv = selectedConversationRef.current;
          if (currentConv?.candidate_id === data.candidateId) {
            // Check if message already exists to avoid duplicates
            if (prev.some(m => m.id === data.message.id)) {
              return prev;
            }
            return [...prev, data.message];
          }
          return prev;
        });
        // Update conversation list to show new message preview
        fetchConversations();
        break;

      case 'message_sent':
        // Confirmation of sent message
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          if (prev.some(m => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
        // Update conversation list
        fetchConversations();
        break;

      case 'status_change':
        // Candidate online/offline status change
        setConversations(prev => prev.map(c =>
          c.candidate_id === data.candidateId
            ? { ...c, online_status: data.status, last_seen: data.last_seen || c.last_seen }
            : c
        ));
        break;

      case 'online_candidates':
        console.log('Online candidates:', data.candidates);
        break;

      case 'typing':
        // Handle typing indicator
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/v1/chat/admin/conversations');
      const data = await res.json();
      if (data.success) setConversations(data.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/v1/chat/admin/candidates');
      const data = await res.json();
      if (data.success) setCandidates(data.data);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v1/chat/templates');
      const data = await res.json();
      if (data.success) setTemplates(data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchMessages = async (candidateId) => {
    try {
      const res = await fetch(`/api/v1/chat/${candidateId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        // Mark as read
        fetch(`/api/v1/chat/admin/${candidateId}/read`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);

    // Send via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        candidateId: selectedConversation.candidate_id,
        content,
      }));
    } else {
      // Fallback to REST
      await fetch(`/api/v1/chat/admin/${selectedConversation.candidate_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      fetchMessages(selectedConversation.candidate_id);
    }

    inputRef.current?.focus();
  };

  const handleQuickReply = (template) => {
    // Replace variables with actual values
    let content = template.content;
    if (selectedConversation) {
      content = content.replace('{name}', selectedConversation.name.split(' ')[0]);
    }
    setNewMessage(content);
    inputRef.current?.focus();
  };

  const startNewConversation = (candidate) => {
    const existingConv = conversations.find(c => c.candidate_id === candidate.id);
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      setSelectedConversation({
        candidate_id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        profile_photo: candidate.profile_photo,
        online_status: candidate.online_status,
        last_seen: candidate.last_seen,
        unread_count: 0,
      });
    }
    setShowNewChat(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCandidates = candidates.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[95vh] bg-dark-900 overflow-hidden rounded-xl">
      {/* Sidebar - Conversations */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} flex-shrink-0 border-r border-dark-700 flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white whitespace-nowrap">Messages</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white text-sm"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.candidate_id}
                conversation={conv}
                active={selectedConversation?.candidate_id === conv.candidate_id}
                onClick={() => setSelectedConversation(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex-shrink-0 w-6 bg-dark-800 hover:bg-dark-700 border-r border-dark-700 flex items-center justify-center transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4 text-dark-400" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-dark-400" />
        )}
      </button>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0 p-4 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedConversation.profile_photo ? (
                    <img
                      src={selectedConversation.profile_photo}
                      alt={selectedConversation.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="font-semibold text-white">{selectedConversation.name?.charAt(0)}</span>
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-800 ${
                    selectedConversation.online_status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium text-white">{selectedConversation.name}</h3>
                  <p className="text-xs text-dark-400">
                    {selectedConversation.online_status === 'online'
                      ? 'Online'
                      : selectedConversation.last_seen
                        ? `Last seen ${new Date(selectedConversation.last_seen).toLocaleString('en-SG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`
                        : 'Offline'
                    }
                  </p>
                </div>
              </div>
              <button className="p-2 text-dark-400 hover:text-white">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            {/* Quick replies bar - below header */}
            {templates.length > 0 && (
              <div className="flex-shrink-0 px-4 py-2 border-b border-dark-700 bg-dark-850">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <Zap className="h-4 w-4 text-dark-400 flex-shrink-0" />
                  {templates.slice(0, 8).map(template => (
                    <QuickReplyChip
                      key={template.id}
                      template={template}
                      onClick={() => handleQuickReply(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-dark-850">
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender === 'admin'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 p-4 border-t border-dark-700 relative">
              {showEmoji && (
                <div className="absolute bottom-full left-4 mb-2">
                  <EmojiPicker
                    onEmojiClick={(emoji) => {
                      setNewMessage(prev => prev + emoji.emoji);
                      inputRef.current?.focus();
                    }}
                    theme="dark"
                    width={320}
                    height={400}
                  />
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className={`p-3 rounded-xl ${showEmoji ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400 hover:text-white'}`}
                >
                  <Smile className="h-5 w-5" />
                </button>
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-xl bg-dark-700 border border-dark-600 text-white resize-none max-h-32"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-3 rounded-xl ${
                    newMessage.trim()
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-dark-700 text-dark-500'
                  }`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-dark-400">
            <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg">Select a conversation</p>
            <p className="text-sm">or start a new one</p>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Conversation</h3>
              <button onClick={() => setShowNewChat(false)} className="text-dark-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredCandidates.map(candidate => (
                <button
                  key={candidate.id}
                  onClick={() => startNewConversation(candidate)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-dark-700 transition-colors"
                >
                  {candidate.profile_photo ? (
                    <img
                      src={candidate.profile_photo}
                      alt={candidate.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="font-semibold text-white">{candidate.name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium text-white">{candidate.name}</p>
                    <p className="text-sm text-dark-400">{candidate.email}</p>
                  </div>
                  <span className={`ml-auto w-2 h-2 rounded-full ${
                    candidate.online_status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
