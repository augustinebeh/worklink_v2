/**
 * Renewal Modal Header Component
 * Displays the header info bar and key metrics for a renewal
 */

import {
  BuildingIcon,
  DollarSignIcon,
  ClockIcon,
  EditIcon,
  TrendingUpIcon,
  CalendarIcon
} from 'lucide-react';
import Button from '../ui/Button';

export function getMonthsUntilExpiry(endDate) {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diffMonths = Math.ceil((end - now) / (1000 * 60 * 60 * 24 * 30));
  return Math.max(0, diffMonths);
}

export function getUrgencyBadge(months) {
  if (months < 0) return { color: 'bg-red-100 text-red-800', text: 'Overdue' };
  if (months <= 3) return { color: 'bg-orange-100 text-orange-800', text: 'Imminent' };
  if (months <= 6) return { color: 'bg-yellow-100 text-yellow-800', text: 'Approaching' };
  return { color: 'bg-blue-100 text-blue-800', text: 'Future' };
}

export function getProbabilityColor(probability) {
  if (probability >= 80) return 'text-green-600';
  if (probability >= 60) return 'text-yellow-600';
  if (probability >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export default function RenewalModalHeader({ renewal, isEditing, onEditClick }) {
  const monthsUntilExpiry = getMonthsUntilExpiry(renewal.contract_end_date);
  const urgencyBadge = getUrgencyBadge(monthsUntilExpiry);

  return (
    <>
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {renewal.contract_description}
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <BuildingIcon className="h-4 w-4" />
              <span>{renewal.agency}</span>
            </div>

            <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyBadge.color}`}>
              {urgencyBadge.text}
            </span>

            <div className="flex items-center gap-1 text-sm text-gray-600">
              <ClockIcon className="h-4 w-4" />
              <span>{monthsUntilExpiry} months remaining</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              icon={EditIcon}
              onClick={onEditClick}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contract Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(renewal.contract_value || 0).toLocaleString()}
              </p>
            </div>
            <DollarSignIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Renewal Probability</p>
              <p className={`text-2xl font-bold ${getProbabilityColor(renewal.renewal_probability)}`}>
                {renewal.renewal_probability}%
              </p>
            </div>
            <TrendingUpIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Months Remaining</p>
              <p className="text-2xl font-bold text-gray-900">{monthsUntilExpiry}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>
    </>
  );
}
