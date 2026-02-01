import { useState, useEffect } from 'react';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  BriefcaseIcon,
  DollarSignIcon,
  ZapIcon,
  MessageCircleIcon,
  CalendarIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

const typeConfig = {
  job: { icon: BriefcaseIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  payment: { icon: DollarSignIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  xp: { icon: ZapIcon, color: 'text-violet-400', bg: 'bg-violet-500/20' },
  message: { icon: MessageCircleIcon, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  reminder: { icon: CalendarIcon, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  default: { icon: BellIcon, color: 'text-white/50', bg: 'bg-white/5' },
};

function NotificationItem({ notification, onMarkRead }) {
  const config = typeConfig[notification.type] || typeConfig.default;
  const Icon = config.icon;
  const isUnread = !notification.read_at;

  return (
    <div
      onClick={() => !notification.read_at && onMarkRead(notification.id)}
      className={clsx(
        'flex items-start gap-4 p-4 transition-colors cursor-pointer',
        isUnread ? 'bg-white/[0.02]' : 'hover:bg-white/[0.02]'
      )}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={clsx('h-5 w-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className={clsx('font-medium', isUnread ? 'text-white' : 'text-white/70')}>
            {notification.title}
          </h3>
          {isUnread && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />}
        </div>
        <p className="text-white/40 text-sm mt-0.5">{notification.message}</p>
        <p className="text-white/30 text-xs mt-1">
          {new Date(notification.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/v1/notifications?candidate_id=${user.id}`);
      const data = await res.json();
      if (data.success) setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`/api/v1/notifications/read-all?candidate_id=${user.id}`, { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Notifications <span className="text-2xl">🔔</span>
            </h1>
            <p className="text-white/40 text-sm">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium"
            >
              <CheckIcon className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white'
                  : 'bg-[#0a1628] border border-white/[0.05] text-white/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-[#0a1628] animate-pulse" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]">
            <BellIcon className="h-16 w-16 mx-auto mb-4 text-white/10" />
            <h3 className="text-white font-semibold mb-2">No notifications</h3>
            <p className="text-white/40 text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0a1628]/50 border border-white/[0.05] divide-y divide-white/[0.05] overflow-hidden">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
