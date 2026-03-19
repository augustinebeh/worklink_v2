import { Link } from 'react-router-dom';
import {
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  SearchIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import Button from '../ui/Button';
import Modal, { ModalFooter } from '../ui/Modal';
import Input from '../ui/Input';
import { clsx } from 'clsx';

function DeploymentRow({ deployment, onStatusChange }) {
  const statusConfig = {
    pending: { color: 'warning', label: 'Pending' },
    confirmed: { color: 'info', label: 'Confirmed' },
    completed: { color: 'success', label: 'Completed' },
    cancelled: { color: 'error', label: 'Cancelled' },
    no_show: { color: 'error', label: 'No Show' },
  };

  const config = statusConfig[deployment.status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
          <span className="text-white font-semibold">{deployment.candidate_name?.charAt(0)}</span>
        </div>
        <div>
          <Link
            to={`/candidates/${deployment.candidate_id}`}
            className="font-medium text-slate-900 dark:text-white hover:text-primary-600"
          >
            {deployment.candidate_name}
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{deployment.candidate_email}</span>
            {deployment.candidate_phone && <span>{deployment.candidate_phone}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {deployment.rating && (
          <div className="flex items-center gap-1 text-gold-500">
            <StarIcon className="h-4 w-4 fill-gold-400" />
            <span className="font-medium">{deployment.rating}</span>
          </div>
        )}
        <StatusBadge status={deployment.status} />

        {deployment.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange(deployment.id, 'confirmed')}
              className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onStatusChange(deployment.id, 'cancelled')}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobDeploymentList({ deployments, onStatusChange, onOpenAssign }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Assigned Workers ({deployments.length})</CardTitle>
          <Button size="sm" icon={PlusIcon} onClick={onOpenAssign}>
            Assign Worker
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {deployments.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No workers assigned yet</p>
        ) : (
          <div className="space-y-3">
            {deployments.map(d => (
              <DeploymentRow
                key={d.id}
                deployment={d}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AssignWorkerModal({
  isOpen,
  onClose,
  candidates,
  candidateSearch,
  onSearchChange,
  selectedCandidate,
  onSelectCandidate,
  onAssign,
  saving,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Worker"
      description="Select a candidate to assign to this job"
    >
      <div className="space-y-4">
        <Input
          placeholder="Search candidates..."
          icon={SearchIcon}
          value={candidateSearch}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto space-y-2">
          {candidates
            .filter(c => c.name.toLowerCase().includes(candidateSearch.toLowerCase()))
            .map((candidate) => (
              <div
                key={candidate.id}
                onClick={() => onSelectCandidate(candidate.id)}
                className={clsx(
                  'p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3',
                  selectedCandidate === candidate.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                    : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-semibold">{candidate.name?.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{candidate.name}</p>
                  <p className="text-sm text-slate-500">Level {candidate.level || 1} • {candidate.total_jobs_completed || 0} jobs</p>
                </div>
                {candidate.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <StarIcon className="h-4 w-4 fill-amber-400" />
                    <span>{candidate.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          {candidates.length === 0 && (
            <p className="text-center text-slate-500 py-8">No available candidates</p>
          )}
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onAssign} loading={saving} disabled={!selectedCandidate}>Assign Worker</Button>
      </ModalFooter>
    </Modal>
  );
}
