import { useState, useEffect, useRef } from 'react';
import { 
  SendIcon, 
  SmileIcon,
  CheckIcon,
  CheckCheckIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';
import EmojiPicker from 'emoji-picker-react';

function MessageBubble({ message, isOwn }) {
  const time = new Date(message.created_at).toLocaleTimeString('en-SG', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={clsx(
        'max-w-[80%] px-4 py-2.5 rounded-2xl relative',
        isOwn 
          ? 'bg-primary-500 text-white rounded-br-md' 
          : 'bg-dark-800 text-white rounded-bl-md'
      )}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div className={clsx(
          'flex items-center gap-1 mt-1',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span className={clsx('text-xs', isOwn ? 'text-white/60' : 'text-dark-500')}>
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
  const today = new Date();
  const msgDate = new Date(date);
  
  let label;
  if (msgDate.toDateString() === today.toDateString()) {
    label = 'Today';
  } else if (msgDate.toDateString() === new Date(today - 86400000).toDateString()) {
    label = 'Yesterday';
  } else {
    label = msgDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 rounded-full bg-dark-800 text-dark-400 text-xs">
        {label}
      </span>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const ws = useWebSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (ws) {
      ws.sendTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        ws.sendTyping(false);
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

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center pb-24">
        <p className="text-dark-400">Please log in to chat</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-900 px-4 pt-safe pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold">TV</span>
          </div>
          <div>
            <h1 className="font-semibold text-white">TalentVis Support</h1>
            <div className="flex items-center gap-1">
              <span className={clsx(
                'w-2 h-2 rounded-full',
                ws?.isConnected ? 'bg-accent-400' : 'bg-dark-500'
              )} />
              <span className="text-xs text-dark-400">
                {ws?.isConnected ? (isTyping ? 'Typing...' : 'Online') : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
              <SendIcon className="h-8 w-8 text-primary-400" />
            </div>
            <p className="text-white font-medium">Start a conversation</p>
            <p className="text-dark-400 text-sm mt-1">Send a message to TalentVis support</p>
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-24 left-4 right-4 z-20">
          <EmojiPicker 
            onEmojiClick={handleEmojiClick}
            width="100%"
            height={350}
            theme="dark"
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-16 bg-dark-950 px-4 py-3 border-t border-white/5">
        <div className="flex items-end gap-2">
          <button 
            onClick={() => setShowEmoji(!showEmoji)}
            className={clsx(
              'p-3 rounded-xl transition-colors',
              showEmoji ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'
            )}
          >
            <SmileIcon className="h-5 w-5" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none max-h-32"
              style={{ minHeight: '48px' }}
            />
          </div>
          
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={clsx(
              'p-3 rounded-xl transition-colors',
              newMessage.trim() 
                ? 'bg-primary-500 text-white' 
                : 'bg-dark-800 text-dark-500'
            )}
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
