import {
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';

// Priority colors and configurations
export const PRIORITY_CONFIG = {
  CRITICAL: {
    color: 'bg-red-500 text-white',
    badge: 'danger',
    icon: AlertTriangle,
    slaMinutes: 5
  },
  URGENT: {
    color: 'bg-orange-500 text-white',
    badge: 'warning',
    icon: AlertCircle,
    slaMinutes: 15
  },
  HIGH: {
    color: 'bg-yellow-500 text-white',
    badge: 'warning',
    icon: Clock,
    slaMinutes: 60
  },
  NORMAL: {
    color: 'bg-blue-500 text-white',
    badge: 'primary',
    icon: User,
    slaMinutes: 240
  },
  LOW: {
    color: 'bg-gray-500 text-white',
    badge: 'secondary',
    icon: MessageSquare,
    slaMinutes: 1440
  }
};

// Status configurations
export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', badge: 'warning' },
  assigned: { label: 'Assigned', color: 'text-blue-600', badge: 'primary' },
  in_progress: { label: 'In Progress', color: 'text-purple-600', badge: 'primary' },
  resolved: { label: 'Resolved', color: 'text-green-600', badge: 'success' },
  closed: { label: 'Closed', color: 'text-gray-600', badge: 'secondary' }
};
