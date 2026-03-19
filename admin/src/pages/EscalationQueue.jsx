import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Bell,
  BellOff
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAdminWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';

import EscalationCard from '../components/escalation/EscalationCard';
import EscalationFilters from '../components/escalation/EscalationFilters';
import EscalationDetailModal from '../components/escalation/EscalationDetailModal';
import EscalationStats from '../components/escalation/EscalationStats';
import AssignmentModal from '../components/escalation/AssignmentModal';

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

  const { subscribe } = useAdminWebSocket();
  const toast = useToast();
  const refreshInterval = useRef(null);

  // Fetch escalations
  const fetchEscalations = useCallback(async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignedAdmin) params.assignedAdmin = filters.assignedAdmin;
      if (filters.unassignedOnly) params.unassignedOnly = 'true';
      if (filters.slaBreachedOnly) params.slaBreachedOnly = 'true';

      // TODO: Create adminEscalation service - using raw client for now
      const data = await api.client.get('/admin-escalation/queue', { params });

      if (data.success) {
        setEscalations(data.data.escalations);
        setSummary(data.data.summary);
      }
    } catch (error) {
      toast.error('Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      // TODO: Create adminEscalation service - using raw client for now
      const data = await api.client.get('/admin-escalation/summary');
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      // Failed to fetch summary
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
      }, 30000);
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
      const data = await api.client.put(`/admin-escalation/assign/${escalation.id}`, { adminId });
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
      const data = await api.client.put(`/admin-escalation/status/${escalation.id}`, {
        status,
        notes,
        adminId: 'current-admin'
      });
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
      const data = await api.client.post('/admin-escalation/bulk-assign', {
        escalationIds: selectedEscalations,
        adminId
      });
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
      <EscalationStats summary={summary} />

      {/* Toolbar & Filters */}
      <EscalationFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filters={filters}
        onFilterChange={setFilters}
        selectedCount={selectedEscalations.length}
        onBulkAssign={() => setShowAssignModal(true)}
        onClearSelection={() => setSelectedEscalations([])}
      />

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
      <AssignmentModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        selectedCount={selectedEscalations.length}
        onAssign={handleBulkAssign}
      />

      {/* Details Modal */}
      <EscalationDetailModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        escalation={selectedEscalation}
        onAssign={handleAssign}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
