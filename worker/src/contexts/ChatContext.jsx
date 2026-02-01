import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?candidateId=${user.id}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        // Send online status
        wsRef.current.send(JSON.stringify({ type: 'status', status: 'online' }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.type, data);

        switch (data.type) {
          case 'chat_message':
            // Message from admin
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === data.message?.id)) return prev;
              return [...prev, data.message];
            });
            if (data.message?.sender === 'admin') {
              setUnreadCount(prev => prev + 1);
              // Show notification if page is not visible
              if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New Message from WorkLink', {
                  body: data.message.content,
                  icon: '/icon-192x192.png',
                });
              }
            }
            break;

          case 'message_sent':
            // Confirmation of our sent message
            setMessages(prev => {
              if (prev.some(m => m.id === data.message?.id)) return prev;
              return [...prev, data.message];
            });
            break;

          case 'chat_history':
            setMessages(data.messages || []);
            setUnreadCount(data.unreadCount || 0);
            break;

          case 'connected':
            console.log('WebSocket connected as candidate');
            break;

          case 'messages_read':
            // Admin read our messages
            break;

          case 'typing':
            // Admin is typing
            break;

          case 'notification':
            // Handle notifications
            break;

          default:
            console.log('Unknown WebSocket message type:', data.type);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [user]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Send message
  const sendMessage = useCallback((content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content,
      candidateId: user.id,
    }));
    return true;
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'read', candidateId: user?.id }));
    }
  }, [user]);

  // Fetch message history via REST
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/v1/chat/${user.id}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      connect();
      fetchHistory();
    }
    return () => disconnect();
  }, [user, connect, disconnect, fetchHistory]);

  return (
    <ChatContext.Provider value={{
      messages,
      unreadCount,
      isConnected,
      sendMessage,
      markAsRead,
      fetchHistory,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};
