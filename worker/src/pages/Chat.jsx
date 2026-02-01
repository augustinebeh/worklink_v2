import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SendIcon,
  SmileIcon,
  CheckIcon,
  CheckCheckIcon,
  ChevronLeftIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';
import EmojiPicker from 'emoji-picker-react';
import { LogoIcon } from '../components/ui/Logo';
import { DEFAULT_LOCALE, TIMEZONE, getSGDateString, MS_PER_DAY } from '../utils/constants';

// Parse DB timestamp (stored as UTC without timezone indicator)
function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  // If timestamp doesn't end with Z, append it to indicate UTC
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}

function MessageBubble({ message, isOwn }) {
  const time = parseUTCTimestamp(message.created_at).toLocaleTimeString(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE
  });

  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={clsx(
        'max-w-[80%] px-4 py-2.5 rounded-2xl relative',
        isOwn
          ? 'bg-primary-500 text-white rounded-br-md'
          : 'bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white rounded-bl-md'
      )}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className={clsx(
          'flex items-center gap-1 mt-1',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span className={clsx('text-xs', isOwn ? 'text-white/60' : 'text-slate-500 dark:text-dark-500')}>
            {time}
          </span>
          {isOwn && (
            message.read
              ? <CheckCheckIcon className="h-3 w-3 text-white/60" />
              : <CheckIcon className="h-3 w-3 text-white/60" />
          )}
        </div>
      </div>
    </div>
  );
}

function DateDivider({ date }) {
  const todaySG = getSGDateString();
  const yesterdaySG = getSGDateString(new Date(Date.now() - MS_PER_DAY));
  const msgDateSG = getSGDateString(parseUTCTimestamp(date));

  let label;
  if (msgDateSG === todaySG) {
    label = 'Today';
  } else if (msgDateSG === yesterdaySG) {
    label = 'Yesterday';
  } else {
    label = parseUTCTimestamp(date).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE });
  }

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-dark-400 text-xs">
        {label}
      </span>
    </div>
  );
}

// Typing indicator bubble like WhatsApp
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-200 dark:bg-dark-800 px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-slate-400 dark:bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 dark:bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 dark:bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const ws = useWebSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingSentRef = useRef(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  // Listen to WebSocket messages
  useEffect(() => {
    if (!ws) return;

    const unsubHistory = ws.subscribe('chat_history', (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });

    const unsubMessage = ws.subscribe('chat_message', (data) => {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    const unsubSent = ws.subscribe('message_sent', (data) => {
      // Message was sent successfully - already added optimistically
    });

    const unsubTyping = ws.subscribe('typing', (data) => {
      setIsTyping(data.typing);
    });

    const unsubRead = ws.subscribe('messages_read', () => {
      setMessages(prev => prev.map(m => ({ ...m, read: 1 })));
    });

    return () => {
      unsubHistory?.();
      unsubMessage?.();
      unsubSent?.();
      unsubTyping?.();
      unsubRead?.();
    };
  }, [ws]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (ws && messages.length > 0) {
      ws.markMessagesRead();
    }
  }, [ws, messages.length]);

  const fetchMessages = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/v1/chat/${user.id}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        // Mark as read
        fetch(`/api/v1/chat/${user.id}/read`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleTyping = () => {
    if (ws) {
      // Only send typing: true if we haven't already (debounce)
      if (!isTypingSentRef.current) {
        ws.sendTyping(true);
        isTypingSentRef.current = true;
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing indicator after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        ws.sendTyping(false);
        isTypingSentRef.current = false;
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    setShowEmoji(false);

    // Stop typing indicator
    if (ws) {
      ws.sendTyping(false);
      isTypingSentRef.current = false;
    }

    // Optimistically add message
    const tempMessage = {
      id: Date.now(),
      content,
      sender: 'candidate',
      created_at: new Date().toISOString(),
      read: 0,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Send via WebSocket
      if (ws?.isConnected) {
        ws.sendChatMessage(content);
      } else {
        // Fallback to REST
        await fetch(`/api/v1/chat/${user.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    // Close emoji picker when focusing input
    setShowEmoji(false);
  };

  // Group messages by date (Singapore timezone)
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = getSGDateString(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="h-screen bg-white dark:bg-dark-950 flex items-center justify-center">
        <p className="text-slate-500 dark:text-dark-400">Please log in to chat</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-dark-950 flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-slate-50 dark:bg-dark-900 px-4 pt-safe pb-3 border-b border-slate-200 dark:border-white/5 z-10">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-dark-800 transition-colors"
          >
            <ChevronLeftIcon className="h-6 w-6 text-slate-900 dark:text-white" />
          </button>

          <LogoIcon size={36} />
          <div className="flex-1">
            <h1 className="font-semibold text-slate-900 dark:text-white">WorkLink Support</h1>
            <div className="flex items-center gap-1.5">
              <span className={clsx(
                'w-2 h-2 rounded-full',
                ws?.isConnected ? 'bg-accent-400' : 'bg-slate-400 dark:bg-dark-500'
              )} />
              <span className="text-xs text-slate-500 dark:text-dark-400">
                {ws?.isConnected ? (isTyping ? 'Typing...' : 'Online') : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 bg-slate-100 dark:bg-dark-950"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
              <SendIcon className="h-8 w-8 text-primary-400" />
            </div>
            <p className="text-slate-900 dark:text-white font-medium">Start a conversation</p>
            <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">Send a message to WorkLink support</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <DateDivider date={date} />
                <div className="space-y-3">
                  {msgs.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.sender === 'candidate'}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Typing indicator - shows when admin is typing */}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Emoji picker - positioned above input */}
      {showEmoji && (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/5">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width="100%"
            height={280}
            theme="auto"
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-dark-950 px-3 py-2 pb-safe border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={clsx(
              'p-2.5 rounded-full transition-colors flex-shrink-0',
              showEmoji ? 'bg-primary-500 text-white' : 'text-slate-500 dark:text-dark-400 hover:text-slate-700 dark:hover:text-white'
            )}
          >
            <SmileIcon className="h-5 w-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            placeholder="Message"
            className="flex-1 h-10 px-4 rounded-full bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-dark-500 focus:outline-none focus:border-primary-500 text-sm"
          />

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={clsx(
              'p-2.5 rounded-full transition-colors flex-shrink-0',
              newMessage.trim()
                ? 'bg-primary-500 text-white'
                : 'text-slate-400 dark:text-dark-500'
            )}
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
