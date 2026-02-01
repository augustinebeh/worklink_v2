import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Send,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  Phone,
  Mail,
  User,
  Clock,
  Bot,
  Sparkles,
  Power,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Volume2,
  VolumeX,
  Timer,
  TimerOff,
  AlignLeft,
  AlignJustify,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { clsx } from 'clsx';
import { useAdminWebSocket } from '../contexts/WebSocketContext';

// Notification sound using Web Audio API
let audioContext = null;
function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant notification tone (two-tone chime)
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound:', e);
  }
}

// Parse DB timestamp (stored as UTC without timezone indicator)
function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  // If timestamp doesn't end with Z, append it to indicate UTC
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}

// Message bubble component
function MessageBubble({ message, isOwn, onFeedback }) {
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
      console.error('Failed to submit feedback:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceInfo = getSourceInfo();

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
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

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
            message.read
              ? <CheckCheck className="h-3.5 w-3.5 text-white/70" />
              : <Check className="h-3.5 w-3.5 text-white/50" />
          )}
        </div>
      </div>
    </div>
  );
}

// AI Suggestion bubble component
function AISuggestionBubble({ suggestion, onAccept, onEdit, onDismiss }) {
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.content);

  const handleEdit = () => {
    if (editMode) {
      onEdit(editedContent);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  return (
    <div className="mx-4 mb-3 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-medium text-violet-700 dark:text-violet-300">AI Suggestion</span>
        {suggestion.source && (
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full',
            suggestion.fromKB
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
          )}>
            {suggestion.fromKB ? 'Knowledge Base' : 'AI'}
          </span>
        )}
        {suggestion.confidence && (
          <span className="text-xs text-slate-500">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {editMode ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          rows={3}
        />
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {suggestion.content}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onAccept(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {editMode ? 'Send Edited' : 'Accept & Send'}
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          {editMode ? 'Cancel' : 'Edit'}
        </button>
        <button
          onClick={() => onDismiss(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

// AI Mode selector component
function AIModeSelector({ mode, onChange, candidateId }) {
  const modes = [
    { value: 'off', label: 'Off', icon: Power, color: 'slate' },
    { value: 'suggest', label: 'Suggest', icon: Sparkles, color: 'violet' },
    { value: 'auto', label: 'Auto', icon: Bot, color: 'emerald' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
      {modes.map(({ value, label, icon: Icon, color }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === value
              ? color === 'slate'
                ? 'bg-slate-600 text-white'
                : color === 'violet'
                  ? 'bg-violet-500 text-white'
                  : 'bg-emerald-500 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
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
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900 dark:text-white truncate">
            {conversation.name}
          </span>
          <span className="text-xs text-slate-400">
            {conversation.last_message_at
              ? parseUTCTimestamp(conversation.last_message_at).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' })
              : ''
            }
          </span>
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

// Quick reply chip component
function QuickReplyChip({ template, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap border border-slate-200 dark:border-slate-700"
    >
      {template.name}
    </button>
  );
}

export default function AdminChat() {
  const { fetchUnreadTotal, subscribe, send, isConnected, markMessagesRead } = useAdminWebSocket();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem('chat_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // AI Chat state
  const [aiMode, setAiMode] = useState('off');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [typingDelayEnabled, setTypingDelayEnabled] = useState(true);
  const [responseStyle, setResponseStyle] = useState('concise'); // 'concise' or 'normal'

  // Toggle sound and save preference
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('chat_sound_enabled', JSON.stringify(newValue));
      // Play a test sound when enabling
      if (newValue) playNotificationSound();
      return newValue;
    });
  }, []);

  // Fetch AI settings including typing delay and response style
  const fetchAISettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/ai-chat/settings');
      const data = await res.json();
      if (data.success) {
        setTypingDelayEnabled(data.data.typing_delay_enabled !== false);
        setResponseStyle(data.data.response_style || 'concise');
      }
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
    }
  }, []);

  // Toggle typing delay setting
  const toggleTypingDelay = useCallback(async () => {
    const newValue = !typingDelayEnabled;
    setTypingDelayEnabled(newValue);
    try {
      await fetch('/api/v1/ai-chat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'typing_delay_enabled', value: newValue }),
      });
    } catch (error) {
      console.error('Failed to update typing delay setting:', error);
      setTypingDelayEnabled(!newValue); // Revert on error
    }
  }, [typingDelayEnabled]);

  // Toggle response style (concise <-> normal)
  const toggleResponseStyle = useCallback(async () => {
    const newValue = responseStyle === 'concise' ? 'normal' : 'concise';
    setResponseStyle(newValue);
    try {
      await fetch('/api/v1/ai-chat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'response_style', value: newValue }),
      });
    } catch (error) {
      console.error('Failed to update response style:', error);
      setResponseStyle(responseStyle); // Revert on error
    }
  }, [responseStyle]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fetch initial data
  useEffect(() => {
    fetchConversations();
    fetchCandidates();
    fetchTemplates();
    fetchAISettings();
  }, []);

  // Subscribe to WebSocket messages using shared context
  useEffect(() => {
    if (!subscribe) return;

    const unsubNewMessage = subscribe('new_message', (data) => {
      console.log('New message received:', data);
      if (soundEnabledRef.current) {
        playNotificationSound();
      }
      setMessages(prev => {
        const currentConv = selectedConversationRef.current;
        if (currentConv?.candidate_id === data.candidateId) {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        }
        return prev;
      });
      fetchConversations();
    });

    const unsubMessageSent = subscribe('message_sent', (data) => {
      setMessages(prev => {
        // Check if message already exists by ID
        if (prev.some(m => m.id === data.message.id)) return prev;

        // Check for optimistic message (same content from admin within last 10 seconds)
        // and replace it with the real message
        const optimisticIndex = prev.findIndex(m =>
          m.sender === 'admin' &&
          m.content === data.message.content &&
          typeof m.id === 'number' && m.id > Date.now() - 10000
        );

        if (optimisticIndex !== -1) {
          // Replace optimistic message with real one
          const updated = [...prev];
          updated[optimisticIndex] = data.message;
          return updated;
        }

        return [...prev, data.message];
      });
      fetchConversations();
    });

    const unsubStatusChange = subscribe('status_change', (data) => {
      setConversations(prev => prev.map(c =>
        c.candidate_id === data.candidateId
          ? { ...c, online_status: data.status, last_seen: data.last_seen || c.last_seen }
          : c
      ));
    });

    const unsubAiSuggestion = subscribe('ai_suggestion', (data) => {
      console.log('AI suggestion received:', data);
      const currentConv = selectedConversationRef.current;
      if (currentConv?.candidate_id === data.candidateId) {
        setAiSuggestion(data.suggestion);
      }
    });

    const unsubAiUpdate = subscribe('ai_suggestion_update', () => {
      setAiSuggestion(null);
    });

    const unsubAiMessageSent = subscribe('ai_message_sent', (data) => {
      console.log('AI message sent:', data);
      fetchMessages(data.candidateId);
    });

    const unsubAiModeUpdated = subscribe('ai_mode_updated', (data) => {
      if (selectedConversationRef.current?.candidate_id === data.candidateId) {
        setAiMode(data.mode);
      }
    });

    return () => {
      unsubNewMessage();
      unsubMessageSent();
      unsubStatusChange();
      unsubAiSuggestion();
      unsubAiUpdate();
      unsubAiMessageSent();
      unsubAiModeUpdated();
    };
  }, [subscribe]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.candidate_id);
      fetchAIMode(selectedConversation.candidate_id);
      setAiSuggestion(null); // Clear suggestion when switching conversations

      // Mark messages as read when opening conversation
      if (isConnected && selectedConversation.unread_count > 0) {
        send({
          type: 'read',
          candidateId: selectedConversation.candidate_id
        });
        // Update global unread total
        fetchUnreadTotal();
      }
      // Also update local state to clear unread count
      setConversations(prev => prev.map(c =>
        c.candidate_id === selectedConversation.candidate_id
          ? { ...c, unread_count: 0 }
          : c
      ));
    }
  }, [selectedConversation, fetchUnreadTotal, isConnected, send]);

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
        fetch(`/api/v1/chat/admin/${candidateId}/read`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchAIMode = async (candidateId) => {
    try {
      const res = await fetch(`/api/v1/ai-chat/conversations/${candidateId}/mode`);
      const data = await res.json();
      if (data.success) {
        setAiMode(data.data.mode);
      }
    } catch (error) {
      console.error('Failed to fetch AI mode:', error);
      setAiMode('off');
    }
  };

  const handleAIModeChange = async (newMode) => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`/api/v1/ai-chat/conversations/${selectedConversation.candidate_id}/mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (data.success) {
        setAiMode(newMode);
        if (newMode === 'off') {
          setAiSuggestion(null);
        }
      }
    } catch (error) {
      console.error('Failed to update AI mode:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    if (!selectedConversation || !suggestion) return;

    try {
      const res = await fetch(`/api/v1/ai-chat/suggestions/${suggestion.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: selectedConversation.candidate_id }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSuggestion(null);
        fetchMessages(selectedConversation.candidate_id);
      }
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const handleEditSuggestion = async (editedContent) => {
    if (!selectedConversation || !aiSuggestion) return;

    try {
      const res = await fetch(`/api/v1/ai-chat/suggestions/${aiSuggestion.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedConversation.candidate_id,
          content: editedContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSuggestion(null);
        fetchMessages(selectedConversation.candidate_id);
      }
    } catch (error) {
      console.error('Failed to edit suggestion:', error);
    }
  };

  const handleDismissSuggestion = async (suggestion) => {
    if (!suggestion) return;

    try {
      await fetch(`/api/v1/ai-chat/suggestions/${suggestion.id}/dismiss`, {
        method: 'POST',
      });
      setAiSuggestion(null);
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);

    // Optimistically add message to UI immediately
    const optimisticMessage = {
      id: Date.now(),
      candidate_id: selectedConversation.candidate_id,
      sender: 'admin',
      content,
      channel: 'app',
      read: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      if (isConnected) {
        send({
          type: 'message',
          candidateId: selectedConversation.candidate_id,
          content,
        });
      } else {
        // Fallback to HTTP API
        const res = await fetch(`/api/v1/chat/admin/${selectedConversation.candidate_id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          console.error('Failed to send message via HTTP');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    inputRef.current?.focus();
  };

  const handleQuickReply = (template) => {
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
    <div className="h-[calc(100vh-7rem)]">
      <Card padding="none" className="h-full flex overflow-hidden">
        {/* Sidebar - Conversations */}
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
                      onClick={() => setShowNewChat(true)}
                      className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
            {sidebarCollapsed && (
              <button
                onClick={() => setShowNewChat(true)}
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
                  onClick={() => setSelectedConversation(conv)}
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

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
          {selectedConversation ? (
            <>
              {/* Chat header */}
              <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {selectedConversation.profile_photo ? (
                        <img
                          src={selectedConversation.profile_photo}
                          alt={selectedConversation.name}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                          <span className="font-semibold text-primary-600 dark:text-primary-400">
                            {selectedConversation.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className={clsx(
                        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
                        selectedConversation.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {selectedConversation.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {selectedConversation.online_status === 'online' ? (
                          <Badge variant="success" size="xs">Online</Badge>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            {selectedConversation.last_seen
                              ? `Last seen ${new Date(selectedConversation.last_seen).toLocaleString('en-SG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' })}`
                              : 'Offline'
                            }
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AIModeSelector
                      mode={aiMode}
                      onChange={handleAIModeChange}
                      candidateId={selectedConversation.candidate_id}
                    />
                    <button
                      onClick={toggleTypingDelay}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        typingDelayEnabled
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                      title={typingDelayEnabled ? 'Typing delay ON (3-5s) - Click to disable' : 'Typing delay OFF - Click to enable'}
                    >
                      {typingDelayEnabled ? <Timer className="h-5 w-5" /> : <TimerOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleResponseStyle}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        responseStyle === 'normal'
                          ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                      title={responseStyle === 'normal' ? 'Normal replies (detailed) - Click for concise' : 'Concise replies (short) - Click for normal'}
                    >
                      {responseStyle === 'normal' ? <AlignJustify className="h-5 w-5" /> : <AlignLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleSound}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        soundEnabled
                          ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                      title={soundEnabled ? 'Sound on (click to mute)' : 'Sound off (click to unmute)'}
                    >
                      {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </button>
                    {selectedConversation.email && (
                      <a
                        href={`mailto:${selectedConversation.email}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Send email"
                      >
                        <Mail className="h-5 w-5" />
                      </a>
                    )}
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick replies bar */}
              {templates.length > 0 && (
                <div className="flex-shrink-0 px-6 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-slate-400 flex-shrink-0">Quick replies:</span>
                    {templates.slice(0, 6).map(template => (
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
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.sender === 'admin'}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Suggestion */}
              {aiSuggestion && aiMode === 'suggest' && (
                <AISuggestionBubble
                  suggestion={aiSuggestion}
                  onAccept={handleAcceptSuggestion}
                  onEdit={handleEditSuggestion}
                  onDismiss={handleDismissSuggestion}
                />
              )}

              {/* Input area */}
              <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                {showEmoji && (
                  <div className="absolute bottom-20 left-4 z-10">
                    <EmojiPicker
                      onEmojiClick={(emoji) => {
                        setNewMessage(prev => prev + emoji.emoji);
                        inputRef.current?.focus();
                      }}
                      theme="auto"
                      width={320}
                      height={400}
                    />
                  </div>
                )}

                <div className="flex items-end gap-3">
                  <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={clsx(
                      'p-2.5 rounded-lg transition-colors',
                      showEmoji
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    )}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className={clsx(
                      'p-2.5 rounded-lg transition-colors',
                      newMessage.trim()
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 opacity-50" />
              </div>
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Select a conversation</p>
              <p className="text-sm mt-1">or start a new one</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors text-sm font-medium"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {/* New chat modal */}
        {showNewChat && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New Conversation</h3>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredCandidates.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No candidates found</p>
                  </div>
                ) : (
                  filteredCandidates.map(candidate => (
                    <button
                      key={candidate.id}
                      onClick={() => startNewConversation(candidate)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      {candidate.profile_photo ? (
                        <img
                          src={candidate.profile_photo}
                          alt={candidate.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                          <span className="font-semibold text-primary-600 dark:text-primary-400">
                            {candidate.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-slate-900 dark:text-white">{candidate.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{candidate.email}</p>
                      </div>
                      <span className={clsx(
                        'w-2.5 h-2.5 rounded-full',
                        candidate.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                      )} />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
