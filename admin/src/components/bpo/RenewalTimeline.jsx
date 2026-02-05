import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { renewalService } from "../../shared/services/api";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  AlertCircle,
  User,
  Building,
  Clock,
  ExternalLink
} from 'lucide-react';

/**
 * Renewal Timeline Component
 * Displays 12-month timeline of contract renewals with visual heatmap
 */
export default function RenewalTimeline({ monthsAhead = 12, onRenewalClick }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchTimeline();
  }, [monthsAhead]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const response = await renewalService.getTimeline(monthsAhead);
      if (response.success) {
        setTimeline(response.data.timeline || []);
        setStats(response.data.summary);
      } else {
        setError('Failed to load timeline');
      }
    } catch (err) {
      console.error('Error fetching renewal timeline:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (probability) => {
    if (probability >= 80) return 'bg-green-500';
    if (probability >= 60) return 'bg-yellow-500';
    if (probability >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getUrgencyBadge = (months) => {
    if (months < 0) return { color: 'bg-red-100 text-red-800', text: 'Overdue' };
    if (months <= 3) return { color: 'bg-orange-100 text-orange-800', text: 'Imminent' };
    if (months <= 6) return { color: 'bg-yellow-100 text-yellow-800', text: 'Approaching' };
    return { color: 'bg-blue-100 text-blue-800', text: 'Future' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Renewals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_renewals}</p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.total_value / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Probability</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avg_probability}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.high_priority_count}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Renewal Timeline</h3>
          <p className="text-sm text-gray-600 mt-1">
            Next {monthsAhead} months of contract renewals
          </p>
        </div>

        <div className="p-6 space-y-4">
          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No renewals in the next {monthsAhead} months</p>
            </div>
          ) : (
            timeline.map((month) => (
              <div key={month.month} className="space-y-3">
                {/* Month Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <h4 className="font-semibold text-gray-900">{month.month}</h4>
                    </div>
                    <span className="text-sm text-gray-600">
                      {month.count} renewal{month.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      ${(month.total_value / 1000000).toFixed(2)}M
                    </span>
                  </div>
                </div>

                {/* Renewal Cards */}
                <div className="grid grid-cols-1 gap-3 ml-8">
                  {month.items.map((renewal) => {
                    const urgency = getUrgencyBadge(renewal.months_until_expiry);
                    return (
                      <Link
                        key={renewal.id}
                        to={`/renewals/${renewal.id}`}
                        className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-primary-300 cursor-pointer transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Agency & Description */}
                            <div className="flex items-center space-x-2 mb-2">
                              <Building className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900 group-hover:text-primary-700">{renewal.agency}</span>
                              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {renewal.contract_description}
                            </p>

                            {/* Details */}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3" />
                                <span>${renewal.contract_value.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{renewal.months_until_expiry} months</span>
                              </div>
                              {renewal.assigned_to && (
                                <div className="flex items-center space-x-1">
                                  <User className="h-3 w-3" />
                                  <span>{renewal.assigned_to}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Probability & Urgency */}
                          <div className="flex flex-col items-end space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className={`h-2 w-12 ${getPriorityColor(renewal.renewal_probability)} rounded-full`}></div>
                              <span className="text-sm font-semibold text-gray-900">
                                {renewal.renewal_probability}%
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${urgency.color}`}>
                              {urgency.text}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
