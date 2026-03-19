import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Clock,
  Edit
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import { clsx } from 'clsx';

// Circular Progress Component for Probability
function ProbabilityGauge({ probability = 0, size = 120 }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (probability / 100) * circumference;

  const getColor = (prob) => {
    if (prob >= 70) return '#10b981'; // emerald-500
    if (prob >= 40) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={getColor(probability)}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{probability}%</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">renewal</span>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  not_engaged: 'text-red-600 bg-red-100',
  initial_contact: 'text-amber-600 bg-amber-100',
  active_discussion: 'text-blue-600 bg-blue-100',
  proposal_stage: 'text-purple-600 bg-purple-100',
  negotiation: 'text-emerald-600 bg-emerald-100'
};

const STATUS_LABELS = {
  not_engaged: 'Not Engaged',
  initial_contact: 'Initial Contact',
  active_discussion: 'Active Discussion',
  proposal_stage: 'Proposal Stage',
  negotiation: 'Negotiation'
};

export default function RenewalHeader({ renewal }) {
  const navigate = useNavigate();
  const engagementStatus = renewal.engagement_level || 'not_engaged';

  return (
    <>
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/renewals')}
          icon={ArrowLeft}
        >
          Back to Renewals
        </Button>
        <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-600" />
        <nav className="text-sm text-slate-500">
          <Link to="/renewals" className="hover:text-slate-700">Renewals</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white">{renewal.agency_name}</span>
        </nav>
      </div>

      {/* Header Card */}
      <Card className="border-2 border-primary-100 dark:border-primary-800">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Main Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {renewal.agency_name}
                </h1>
                <h2 className="text-lg text-slate-600 dark:text-slate-400 mb-3">
                  {renewal.contract_description}
                </h2>
                <Badge className={clsx('mb-4', STATUS_COLORS[engagementStatus])}>
                  {STATUS_LABELS[engagementStatus]}
                </Badge>
              </div>
              <Button variant="secondary" icon={Edit}>
                Edit Details
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contract Value</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(renewal.contract_value)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contract End</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(renewal.contract_end_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expected RFP</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(renewal.expected_rfp_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">BD Manager</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {renewal.assigned_bd_manager || 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Probability Gauge */}
          <div className="flex flex-col items-center justify-center lg:min-w-[200px] bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
            <ProbabilityGauge probability={renewal.renewal_probability || 0} />
            <p className="text-sm text-slate-500 mt-3 text-center">
              Renewal Probability
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
