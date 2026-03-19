import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EditIcon,
  UsersIcon,
  MailIcon,
  XCircleIcon,
} from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import Button from '../ui/Button';

export default function JobDetailHeader({ job, onEdit, onCancel }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.title}</h1>
            <p className="text-slate-500">{job.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          <Button variant="secondary" size="sm" icon={EditIcon} onClick={onEdit}>Edit</Button>
        </div>
      </div>
    </div>
  );
}

export function QuickActions({ job, jobId, onCancel }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <Button variant="secondary" className="w-full justify-start" icon={UsersIcon} onClick={() => navigate(`/ai-sourcing?job=${jobId}`)}>
        Find Candidates
      </Button>
      <Button variant="secondary" className="w-full justify-start" icon={MailIcon} onClick={() => navigate(`/chat?job=${jobId}`)}>
        Message Workers
      </Button>
      {job.status === 'open' && (
        <Button variant="danger" className="w-full justify-start" icon={XCircleIcon} onClick={onCancel}>
          Cancel Job
        </Button>
      )}
    </div>
  );
}
