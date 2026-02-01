import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineCandidates, setOnlineCandidates] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const listenersRef = useRef(new Map());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?admin=true`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.log('Admin WebSocket connected');
        setIsConnected(true);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          handleMessage(data);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        logger.log('Admin WebSocket disconnected:', event.code);
        setIsConnected(false);

        if (event.code !== 4001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            logger.log('Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };
    } catch (error) {
      logger.error('Failed to create WebSocket:', error);
    }
  }, [isAuthenticated]);

  // Handle incoming messages
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        logger.debug('Admin connection confirmed');
        break;

      case 'online_candidates':
        setOnlineCandidates(data.candidates || []);
        break;

      case 'status_change':
        if (data.status === 'online') {
          setOnlineCandidates(prev => [...new Set([...prev, data.candidateId])]);
        } else {
          setOnlineCandidates(prev => prev.filter(id => id !== data.candidateId));
        }
        notifyListeners('status_change', data);
        break;

      case 'new_message':
        setUnreadTotal(prev => prev + 1);
        notifyListeners('new_message', data);
        break;

      case 'message_sent':
        notifyListeners('message_sent', data);
        break;

      case 'typing':
        notifyListeners('typing', data);
        break;

      case 'messages_read':
        notifyListeners('messages_read', data);
        break;

      case 'job_created':
        notifyListeners('job_created', data);
        break;

      case 'job_updated':
        notifyListeners('job_updated', data);
        break;

      case 'deployment_created':
      case 'deployment_updated':
        notifyListeners('deployment', data);
        break;

      case 'payment_created':
      case 'payment_status_changed':
        notifyListeners('payment', data);
        break;

      case 'level_up':
        notifyListeners('level_up', data);
        break;

      case 'achievement_unlocked':
        notifyListeners('achievement_unlocked', data);
        break;

      case 'pong':
        break;

      default:
        logger.debug('Unknown admin WebSocket message:', data.type);
    }
  }, []);

  // Notify registered listeners
  const notifyListeners = useCallback((type, data) => {
    const callbacks = listenersRef.current.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }, []);

  // Send message through WebSocket
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    logger.warn('WebSocket not connected, message not sent');
    return false;
  }, []);

  // Send chat message to candidate
  const sendMessageToCandidate = useCallback((candidateId, content, templateId = null) => {
    return send({ type: 'message', candidateId, content, template_id: templateId });
  }, [send]);

  // Send typing indicator
  const sendTyping = useCallback((candidateId, typing) => {
    return send({ type: 'typing', candidateId, typing });
  }, [send]);

  // Mark messages as read
  // Mark messages as read and update unread count
  const markMessagesRead = useCallback((candidateId, unreadCount = 0) => {
    // Decrement total unread by the conversation's unread count
    if (unreadCount > 0) {
      setUnreadTotal(prev => Math.max(0, prev - unreadCount));
    }
    return send({ type: 'read', candidateId });
  }, [send]);

  // Fetch total unread count from server
  const fetchUnreadTotal = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/chat/admin/conversations');
      const data = await res.json();
      if (data.success) {
        const total = data.data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        setUnreadTotal(total);
      }
    } catch (error) {
      console.error('Failed to fetch unread total:', error);
    }
  }, []);

  // Get candidate status
  const getCandidateStatus = useCallback((candidateId) => {
    return send({ type: 'get_status', candidateId });
  }, [send]);

  // Subscribe to specific message types
  const subscribe = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);

    return () => {
      listenersRef.current.get(type)?.delete(callback);
    };
  }, []);

  // Check if candidate is online
  const isCandidateOnline = useCallback((candidateId) => {
    return onlineCandidates.includes(candidateId);
  }, [onlineCandidates]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      fetchUnreadTotal(); // Fetch initial unread count
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(4001, 'Component unmounted');
      }
    };
  }, [isAuthenticated, connect]);

  // Keep-alive ping
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      send({ type: 'ping' });
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected, send]);

  const value = {
    isConnected,
    lastMessage,
    onlineCandidates,
    unreadTotal,
    send,
    sendMessageToCandidate,
    sendTyping,
    markMessagesRead,
    getCandidateStatus,
    subscribe,
    isCandidateOnline,
    fetchUnreadTotal,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useAdminWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useAdminWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;
