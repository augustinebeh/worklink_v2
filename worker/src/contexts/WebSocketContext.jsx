import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const listenersRef = useRef(new Map());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user?.id) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Get token from localStorage for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      logger.error('No authentication token found');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?candidateId=${user.id}&token=${encodeURIComponent(token)}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.log('WebSocket connected');
        setIsConnected(true);
        
        // Clear any pending reconnect
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
        logger.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Reconnect after 3 seconds if not intentional close
        if (event.code !== 4001) { // 4001 = intentional close
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
  }, [user?.id]);

  // Handle incoming messages
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        logger.debug('Connection confirmed:', data);
        break;

      case 'chat_history':
        setUnreadMessages(data.unreadCount || 0);
        notifyListeners('chat_history', data);
        break;

      case 'chat_message':
        setUnreadMessages(prev => prev + 1);
        notifyListeners('chat_message', data);
        break;

      case 'message_sent':
        notifyListeners('message_sent', data);
        break;

      case 'messages_read':
        if (data.by === 'admin') {
          notifyListeners('messages_read', data);
        }
        break;

      case 'typing':
        notifyListeners('typing', data);
        break;

      case 'notifications':
        setNotifications(data.notifications || []);
        setUnreadNotifications(data.unreadCount || 0);
        break;

      case 'notification':
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadNotifications(prev => prev + 1);
        notifyListeners('notification', data);
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

      case 'job_application_result':
        notifyListeners('job_application_result', data);
        break;

      case 'payment_created':
      case 'payment_status_changed':
        notifyListeners('payment', data);
        break;

      case 'xp_earned':
        notifyListeners('xp_earned', data);
        break;

      case 'level_up':
        notifyListeners('level_up', data);
        break;

      case 'achievement_unlocked':
        notifyListeners('achievement_unlocked', data);
        break;

      case 'candidate_updated':
        notifyListeners('candidate_updated', data);
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        logger.debug('Unknown WebSocket message:', data.type);
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

  // Send chat message
  const sendChatMessage = useCallback((content) => {
    return send({ type: 'message', content, candidateId: user?.id });
  }, [send, user?.id]);

  // Send typing indicator
  const sendTyping = useCallback((typing) => {
    return send({ type: 'typing', typing, candidateId: user?.id });
  }, [send, user?.id]);

  // Mark messages as read
  const markMessagesRead = useCallback(() => {
    setUnreadMessages(0);
    return send({ type: 'read', candidateId: user?.id });
  }, [send, user?.id]);

  // Apply for job
  const applyForJob = useCallback((jobId) => {
    return send({ type: 'apply_job', jobId });
  }, [send]);

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: 1 } : n
    ));
    setUnreadNotifications(prev => Math.max(0, prev - 1));
    return send({ type: 'mark_notification_read', notificationId });
  }, [send]);

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setUnreadNotifications(0);
    return send({ type: 'mark_all_notifications_read' });
  }, [send]);

  // Subscribe to specific message types
  const subscribe = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);

    // Return unsubscribe function
    return () => {
      listenersRef.current.get(type)?.delete(callback);
    };
  }, []);

  // Connect when user logs in
  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(4001, 'Component unmounted');
      }
    };
  }, [user?.id, connect]);

  // Keep-alive ping every 30 seconds
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
    unreadMessages,
    unreadNotifications,
    notifications,
    send,
    sendChatMessage,
    sendTyping,
    markMessagesRead,
    applyForJob,
    markNotificationRead,
    markAllNotificationsRead,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;
