import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  MoreVertical,
  UserPlus,
  MessageSquare,
  Phone,
  Mail,
  Star,
  TrendingUp,
  Users,
  Timer,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Bell,
  BellOff,
  Settings
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAdminWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';

// Priority colors and configurations
const PRIORITY_CONFIG = {
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
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600', badge: 'warning' },
  assigned: { label: 'Assigned', color: 'text-blue-600', badge: 'primary' },
  in_progress: { label: 'In Progress', color: 'text-purple-600', badge: 'primary' },
  resolved: { label: 'Resolved', color: 'text-green-600', badge: 'success' },
  closed: { label: 'Closed', color: 'text-gray-600', badge: 'secondary' }
};

// Priority indicator component
function PriorityIndicator({ priority, size = 'md' }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config?.icon || User;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={clsx(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      config?.color
    )}>
      <Icon className={sizeClasses[size]} />
      {priority}
    </div>
  );
}

// Status badge component
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config?.badge || 'secondary'} size="sm">
      {config?.label || status}
    </Badge>
  );
}

// Time since component
function TimeSince({ date, showIcon = true }) {
  const [timeSince, setTimeSince] = useState('');

  useEffect(() => {
    const updateTimeSince = () => {
      if (!date) return;

      const now = new Date();
      const past = new Date(date);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        setTimeSince(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setTimeSince(`${diffHours}h ago`);
      } else {
        setTimeSince(`${diffDays}d ago`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [date]);

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      {showIcon && <Clock className="h-3 w-3" />}
      {timeSince}
    </div>
  );
}

// SLA indicator component
function SLAIndicator({ escalation }) {
  const slaDeadline = new Date(escalation.sla_deadline);
  const now = new Date();
  const isBreached = slaDeadline < now;
  const minutesRemaining = Math.floor((slaDeadline - now) / (1000 * 60));

  if (isBreached) {
    return (
      <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
        <AlertTriangle className="h-3 w-3" />
        SLA BREACHED
      </div>
    );
  }

  if (minutesRemaining <= 30) {
    return (
      <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
        <Timer className="h-3 w-3" />
        {minutesRemaining}m remaining
      </div>
    );
  }

  const hoursRemaining = Math.floor(minutesRemaining / 60);
  return (
    <div className="flex items-center gap-1 text-slate-500 text-xs">
      <Timer className="h-3 w-3" />
      {hoursRemaining > 0 ? `${hoursRemaining}h ${minutesRemaining % 60}m` : `${minutesRemaining}m`}
    </div>
  );
}

// Escalation card component
function EscalationCard({ escalation, onAssign, onViewDetails, onUpdateStatus, isSelected, onSelect }) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const candidate = escalation.context_data?.candidate || {};

  return (
    <div className={clsx(
      'p-4 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer',
      isSelected
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
      escalation.sla_breached && 'ring-2 ring-red-500'
    )} onClick={() => onSelect(escalation)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {candidate.profile_photo ? (
              <img
                src={candidate.profile_photo}
                alt={candidate.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {(candidate.name || 'U').charAt(0)}
                </span>
              </div>
            )}
            {escalation.priority === 'CRITICAL' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {candidate.name || 'Unknown User'}
              </h3>
              <PriorityIndicator priority={escalation.priority} size="sm" />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
              {escalation.trigger_reason}
            </p>

            <div className="flex items-center gap-4 text-xs">
              <StatusBadge status={escalation.status} />
              <TimeSince date={escalation.created_at} />
              {escalation.assigned_admin && (
                <div className="flex items-center gap-1 text-slate-500">
                  <User className="h-3 w-3" />
                  {escalation.assigned_admin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" ref={actionsRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(escalation);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px]">
                  {escalation.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssign(escalation);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(escalation, 'in_progress');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Start Work
                  </button>

                  {['assigned', 'in_progress'].includes(escalation.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(escalation, 'resolved');
                        setShowActions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const candidateId = escalation.candidate_id;
                      window.open(`/admin/chat?candidate=${candidateId}`, '_blank');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Open Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SLA indicator */}
      <div className="flex items-center justify-between">
        <SLAIndicator escalation={escalation} />
        <div className="text-xs text-slate-400">
          #{escalation.id}
        </div>
      </div>
    </div>
  );
}

export default function EscalationQueue() {
  const [escalations, setEscalations] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEscalations, setSelectedEscalations] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedAdmin: '',
    unassignedOnly: false,
    slaBreachedOnly: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [adminStatus, setAdminStatus] = useState('available');

  const { subscribe } = useAdminWebSocket();
  const toast = useToast();
  const refreshInterval = useRef(null);

  // Fetch escalations
  const fetchEscalations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignedAdmin) params.append('assignedAdmin', filters.assignedAdmin);
      if (filters.unassignedOnly) params.append('unassignedOnly', 'true');
      if (filters.slaBreachedOnly) params.append('slaBreachedOnly', 'true');

      const res = await fetch(`/api/v1/admin-escalation/queue?${params}`);
      const data = await res.json();

      if (data.success) {
        setEscalations(data.data.escalations);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch escalations:', error);
      toast.error('Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin-escalation/summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchEscalations();
    fetchSummary();
  }, [fetchEscalations, fetchSummary]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        fetchEscalations();
      }, 30000); // Refresh every 30 seconds
    } else if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh, fetchEscalations]);

  // WebSocket subscriptions
  useEffect(() => {
    if (!subscribe) return;

    const unsubEscalationCreated = subscribe('escalation_created', (data) => {
      toast.info('New Escalation', `${data.escalation.priority} priority escalation created`);
      fetchEscalations();
    });

    const unsubEscalationAssigned = subscribe('escalation_assigned', () => {
      fetchEscalations();
    });

    const unsubSLABreach = subscribe('sla_breach_alert', (data) => {
      toast.error('SLA Breach', `SLA breached for escalation #${data.escalation.id}`);
      fetchEscalations();
    });

    return () => {
      unsubEscalationCreated();
      unsubEscalationAssigned();
      unsubSLABreach();
    };
  }, [subscribe, fetchEscalations, toast]);

  // Handle assignment
  const handleAssign = async (escalation, adminId = null) => {
    try {
      const res = await fetch(`/api/v1/admin-escalation/assign/${escalation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Assigned', data.message);
        fetchEscalations();
      }
    } catch (error) {
      toast.error('Assignment failed', error.message);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (escalation, status, notes = '') => {
    try {
      const res = await fetch(`/api/v1/admin-escalation/status/${escalation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, adminId: 'current-admin' })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Status Updated', data.message);
        fetchEscalations();
      }
    } catch (error) {
      toast.error('Update failed', error.message);
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = async (adminId) => {
    if (selectedEscalations.length === 0) return;

    try {
      const res = await fetch('/api/v1/admin-escalation/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationIds: selectedEscalations,
          adminId
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Bulk Assignment', `${data.data.summary.successful} escalations assigned`);
        setSelectedEscalations([]);
        fetchEscalations();
      }
    } catch (error) {
      toast.error('Bulk assignment failed', error.message);
    }
  };

  // Filter escalations based on search
  const filteredEscalations = escalations.filter(escalation => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const candidate = escalation.context_data?.candidate || {};

    return (
      candidate.name?.toLowerCase().includes(query) ||
      candidate.email?.toLowerCase().includes(query) ||
      escalation.trigger_reason?.toLowerCase().includes(query) ||
      escalation.id.toString().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Escalation Queue
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage and track customer support escalations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {autoRefresh ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Auto-refresh
          </button>

          <Button
            onClick={fetchEscalations}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.total || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.pending || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.inProgress || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">SLA Breached</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.slaBreached || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <UserPlus className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Unassigned</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.unassigned || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card padding="md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search escalations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                showFilters
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          </div>

          {/* Bulk actions */}
          {selectedEscalations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selectedEscalations.length} selected
              </span>
              <Button
                onClick={() => setShowAssignModal(true)}
                variant="outline"
                size="sm"
              >
                Bulk Assign
              </Button>
              <Button
                onClick={() => setSelectedEscalations([])}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>

              <input
                type="text"
                placeholder="Assigned to..."
                value={filters.assignedAdmin}
                onChange={(e) => setFilters(prev => ({ ...prev, assignedAdmin: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />

              <label className="flex items-center gap-2 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.unassignedOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, unassignedOnly: e.target.checked }))}
                  className="rounded"
                />
                Unassigned only
              </label>

              <label className="flex items-center gap-2 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.slaBreachedOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, slaBreachedOnly: e.target.checked }))}
                  className="rounded"
                />
                SLA breached
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Escalations List */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredEscalations.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No escalations found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try adjusting your search or filters' : 'All escalations are resolved!'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredEscalations.map(escalation => (
              <EscalationCard
                key={escalation.id}
                escalation={escalation}
                onAssign={handleAssign}
                onViewDetails={(esc) => {
                  setSelectedEscalation(esc);
                  setShowDetailsModal(true);
                }}
                onUpdateStatus={handleUpdateStatus}
                isSelected={selectedEscalations.includes(escalation.id)}
                onSelect={(esc) => {
                  const isSelected = selectedEscalations.includes(esc.id);
                  if (isSelected) {
                    setSelectedEscalations(prev => prev.filter(id => id !== esc.id));
                  } else {
                    setSelectedEscalations(prev => [...prev, esc.id]);
                  }
                }}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Bulk Assignment"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Assign {selectedEscalations.length} escalation(s) to:
          </p>

          <div className="space-y-2">
            <Button
              onClick={() => {
                handleBulkAssign(null);
                setShowAssignModal(false);
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Auto-assign to available admin
            </Button>

            <Button
              onClick={() => {
                handleBulkAssign('admin-1');
                setShowAssignModal(false);
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <User className="h-4 w-4 mr-2" />
              Assign to Admin 1
            </Button>

            <Button
              onClick={() => {
                handleBulkAssign('admin-2');
                setShowAssignModal(false);
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <User className="h-4 w-4 mr-2" />
              Assign to Admin 2
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Escalation #${selectedEscalation?.id}`}
        size="lg"
      >
        {selectedEscalation && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PriorityIndicator priority={selectedEscalation.priority} />
                <StatusBadge status={selectedEscalation.status} />
                <SLAIndicator escalation={selectedEscalation} />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const candidateId = selectedEscalation.candidate_id;
                    window.open(`/admin/chat?candidate=${candidateId}`, '_blank');
                  }}
                  variant="outline"
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Chat
                </Button>
              </div>
            </div>

            {/* Candidate Info */}
            {selectedEscalation.context_data?.candidate && (
              <Card padding="md">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Candidate Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span>
                    <p className="font-medium">{selectedEscalation.context_data.candidate.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium">{selectedEscalation.context_data.candidate.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Level:</span>
                    <p className="font-medium">{selectedEscalation.context_data.candidate.level || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>
                    <p className="font-medium">{selectedEscalation.context_data.candidate.status || 'N/A'}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Escalation Details */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Escalation Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Reason:</span>
                  <p className="mt-1">{selectedEscalation.trigger_reason}</p>
                </div>
                <div>
                  <span className="text-slate-500">Trigger Type:</span>
                  <p className="mt-1 font-mono text-xs">{selectedEscalation.trigger_type}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500">Created:</span>
                    <p className="mt-1">{new Date(selectedEscalation.created_at).toLocaleString()}</p>
                  </div>
                  {selectedEscalation.assigned_at && (
                    <div>
                      <span className="text-slate-500">Assigned:</span>
                      <p className="mt-1">{new Date(selectedEscalation.assigned_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Recent Messages */}
            {selectedEscalation.context_data?.recentMessages && (
              <Card padding="md">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Recent Messages
                </h3>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {selectedEscalation.context_data.recentMessages.slice(0, 5).map((msg, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-medium">{msg.sender}</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              {selectedEscalation.status === 'pending' && (
                <Button
                  onClick={() => {
                    handleAssign(selectedEscalation);
                    setShowDetailsModal(false);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Me
                </Button>
              )}

              {['assigned', 'in_progress'].includes(selectedEscalation.status) && (
                <Button
                  onClick={() => {
                    handleUpdateStatus(selectedEscalation, 'resolved');
                    setShowDetailsModal(false);
                  }}
                  variant="success"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              )}

              <Button
                onClick={() => {
                  handleUpdateStatus(selectedEscalation, 'in_progress');
                  setShowDetailsModal(false);
                }}
                variant="outline"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Start Work
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}