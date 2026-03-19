import React from 'react';
import {
  BuildingIcon,
  DollarSignIcon,
  TrendingUpIcon,
  UserIcon,
  EyeIcon
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';

/**
 * Get card color based on renewal probability
 */
const getCardColor = (probability) => {
  if (probability >= 80) return 'border-l-green-500 bg-green-50';
  if (probability >= 60) return 'border-l-yellow-500 bg-yellow-50';
  return 'border-l-red-500 bg-red-50';
};

/**
 * Get urgency indicator class based on days until RFP
 */
const getUrgencyClass = (daysUntilRfp) => {
  if (daysUntilRfp < 0) return 'bg-red-500';
  if (daysUntilRfp <= 30) return 'bg-orange-500';
  if (daysUntilRfp <= 90) return 'bg-yellow-500';
  return 'bg-blue-500';
};

/**
 * RenewalTimelineEntry - Individual renewal card within a timeline month column
 */
export default function RenewalTimelineEntry({ renewal, onClick }) {
  return (
    <div
      onClick={() => onClick(renewal)}
      className={`bg-white rounded-lg p-4 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${getCardColor(renewal.renewal_probability)}`}
    >
      {/* Urgency indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className={`w-2 h-2 rounded-full ${getUrgencyClass(renewal.days_until_rfp)}`}></div>
        <span className="text-xs text-gray-500">
          {formatDate(renewal.contract_end_date)}
        </span>
      </div>

      {/* Agency */}
      <div className="flex items-center mb-2">
        <BuildingIcon className="h-4 w-4 text-gray-500 mr-2" />
        <span className="text-sm font-medium text-gray-900 truncate">
          {renewal.agency}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3" style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {renewal.contract_description || 'No description available'}
      </p>

      {/* Value & Probability */}
      <div className="space-y-2">
        {renewal.contract_value && (
          <div className="flex items-center">
            <DollarSignIcon className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-700">
              {formatCurrency(renewal.contract_value)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUpIcon className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-sm text-gray-700">
              {renewal.renewal_probability}% prob.
            </span>
          </div>

          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {renewal.engagement_status?.replace('_', ' ') || 'Not Started'}
          </span>
        </div>
      </div>

      {/* Assigned to */}
      {renewal.assigned_bd_manager && (
        <div className="flex items-center mt-2 pt-2 border-t">
          <UserIcon className="h-3 w-3 text-gray-400 mr-1" />
          <span className="text-xs text-gray-600 truncate">
            {renewal.assigned_bd_manager}
          </span>
        </div>
      )}

      {/* Hover indicator */}
      <div className="flex justify-center mt-2 pt-2 border-t opacity-0 hover:opacity-100 transition-opacity">
        <EyeIcon className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500 ml-1">Click for details</span>
      </div>
    </div>
  );
}
