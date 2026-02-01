import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  CheckIcon,
  CheckCheckIcon,
  BriefcaseIcon,
  WalletIcon,
  TrophyIcon,
  ZapIcon,
  GiftIcon,
  TrashIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE } from '../utils/constants';

const notificationTypeConfig = {
  job: { icon: BriefcaseIcon, color: 'text-blue-400', bg: 'bg-blue-500/20', link: '/jobs' },
  payment: { icon: WalletIcon, color: 'text-accent-400', bg: 'bg-accent-500/20', link: '/wallet' },
  gamification: { icon: TrophyIcon, color: 'text-gold-400', bg: 'bg-gold-500/20', link: '/achievements' },
  xp: { icon: ZapIcon, color: 'text-purple-400', bg: 'bg-purple-500/20', link: '/profile' },
  bonus: { icon: GiftIcon, color: 'text-pink-400', bg: 'bg-pink-500/20', link: '/wallet' },
  system: { icon: BellIcon, color: 'text-slate-400', bg: 'bg-slate-500/20', link: null },
};

function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
  const Icon = config.icon;
  const isRead = notification.read === 1;

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', timeZone: TIMEZONE });
  };

  const handleClick = () => {
    if (!isRead) {
      onRead(notification.id);
    }
    if (config.link) {
      navigate(config.link);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'w-full flex items-start gap-3 p-4 rounded-xl text-left transition-colors',
        isRead
          ? 'bg-slate-100/50 dark:bg-dark-800/30'
          : 'bg-slate-100 dark:bg-dark-800/80 border border-primary-500/20'
      )}
    >
      {/* Icon */}
      <div className={clsx('p-2 rounded-lg flex-shrink-0', config.bg)}>
        <Icon className={clsx('h-5 w-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={clsx(
            'font-medium',
            isRead ? 'text-slate-500 dark:text-dark-300' : 'text-slate-900 dark:text-white'
          )}>
            {notification.title}
          </h4>
          {!isRead && (
            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
          )}
        </div>
        <p className={clsx(
          'text-sm mt-0.5 line-clamp-2',
          isRead ? 'text-slate-400 dark:text-dark-500' : 'text-slate-600 dark:text-dark-400'
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-slate-400 dark:text-dark-500 mt-2">{timeAgo(notification.created_at)}</p>
      </div>
    </button>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const { notifications: wsNotifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useWebSocket() || {};
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Merge WebSocket notifications with fetched ones
  useEffect(() => {
    if (wsNotifications?.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifications = wsNotifications.filter(n => !existingIds.has(n.id));
        return [...newNotifications, ...prev];
      });
    }
  }, [wsNotifications]);

  const fetchNotifications = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/candidates/${user.id}/notifications`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (notificationId) => {
    // Update local state
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, read: 1 } : n
    ));

    // Update via WebSocket if available
    if (markNotificationRead) {
      markNotificationRead(notificationId);
    } else {
      // Fallback to REST
      await fetch(`/api/v1/candidates/${user.id}/notifications/${notificationId}/read`, {
        method: 'POST'
      });
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));

    if (markAllNotificationsRead) {
      markAllNotificationsRead();
    } else {
      await fetch(`/api/v1/candidates/${user.id}/notifications/read-all`, {
        method: 'POST'
      });
    }
  };

  // Filter out chat notifications (admin messages shown on chat bubble instead)
  const nonChatNotifications = notifications.filter(n => n.type !== 'chat');

  const filteredNotifications = nonChatNotifications.filter(n => {
    if (filter === 'unread') return n.read === 0;
    return true;
  });

  const unreadCount = nonChatNotifications.filter(n => n.read === 0).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-950 flex items-center justify-center pb-24">
        <div className="text-center">
          <BellIcon className="h-12 w-12 text-slate-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-dark-400">Please log in to view notifications</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 rounded-xl bg-primary-500 text-white font-medium"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-950/95 backdrop-blur-lg px-4 pt-safe pb-4 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-slate-500 dark:text-dark-400 text-sm mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-400 hover:text-slate-900 dark:hover:text-white text-sm"
            >
              <CheckCheckIcon className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-400'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="h-12 w-12 text-slate-300 dark:text-dark-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-dark-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
