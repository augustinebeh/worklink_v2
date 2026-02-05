import React, { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  BuildingIcon,
  DollarSignIcon,
  CalendarIcon,
  TrendingUpIcon,
  UserIcon,
  EyeIcon
} from 'lucide-react';
import renewalService from '../../shared/services/api/renewal.service';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';

export default function RenewalTimeline({ renewals = [], onRenewalUpdate, loading }) {
  const [timelineData, setTimelineData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Generate 12 months starting from current month
  const generateMonths = () => {
    const months = [];
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    for (let i = 0; i < 12; i++) {
      const month = new Date(start);
      month.setMonth(start.getMonth() + i);
      months.push({
        key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
        date: new Date(month),
        label: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        fullLabel: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }

    return months;
  };

  // Group renewals by month
  const groupRenewalsByMonth = (renewalsData) => {
    const grouped = {};
    const months = generateMonths();

    // Initialize all months
    months.forEach(month => {
      grouped[month.key] = {
        ...month,
        renewals: [],
        totalValue: 0,
        averageProbability: 0,
        count: 0
      };
    });

    // Group renewals
    renewalsData.forEach(renewal => {
      if (renewal.contract_end_date) {
        const endDate = new Date(renewal.contract_end_date);
        const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

        if (grouped[monthKey]) {
          grouped[monthKey].renewals.push(renewal);
          grouped[monthKey].totalValue += renewal.contract_value || 0;
          grouped[monthKey].count += 1;
        }
      }
    });

    // Calculate averages
    Object.keys(grouped).forEach(monthKey => {
      const month = grouped[monthKey];
      if (month.count > 0) {
        month.averageProbability = Math.round(
          month.renewals.reduce((sum, r) => sum + (r.renewal_probability || 0), 0) / month.count
        );
      }
    });

    return Object.values(grouped);
  };

  // Get card color based on probability
  const getCardColor = (probability) => {
    if (probability >= 80) return 'border-l-green-500 bg-green-50';
    if (probability >= 60) return 'border-l-yellow-500 bg-yellow-50';
    return 'border-l-red-500 bg-red-50';
  };

  // Get urgency indicator
  const getUrgencyClass = (daysUntilRfp) => {
    if (daysUntilRfp < 0) return 'bg-red-500';
    if (daysUntilRfp <= 30) return 'bg-orange-500';
    if (daysUntilRfp <= 90) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Handle renewal card click
  const handleRenewalClick = (renewal) => {
    setSelectedRenewal(renewal);
    setShowDetailModal(true);
  };

  // Handle renewal update from modal
  const handleModalUpdate = async (updateData) => {
    if (selectedRenewal && onRenewalUpdate) {
      await onRenewalUpdate(selectedRenewal.id, updateData);
      setShowDetailModal(false);
      setSelectedRenewal(null);
    }
  };

  // Navigate months
  const navigateMonths = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(newDate);
  };

  useEffect(() => {
    const grouped = groupRenewalsByMonth(renewals);
    setTimelineData(grouped);
  }, [renewals, currentDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Timeline Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">12-Month Renewal Timeline</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonths('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-medium">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} →
            </span>
            <button
              onClick={() => navigateMonths('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-4">
        <div className="relative">
          {/* Horizontal scroll container */}
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4" style={{ minWidth: '1200px' }}>
              {timelineData.map((month) => (
                <div key={month.key} className="flex-shrink-0 w-80">
                  {/* Month Header */}
                  <div className="sticky top-0 z-10 bg-white border rounded-t-lg p-3 border-b-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{month.label}</h3>
                      <div className="text-sm text-gray-500">{month.count} items</div>
                    </div>
                    {month.count > 0 && (
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Total Value:</span>
                          <span className="font-medium">{formatCurrency(month.totalValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Probability:</span>
                          <span className="font-medium">{month.averageProbability}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Month Content */}
                  <div className="border border-t-0 rounded-b-lg min-h-96 p-3 space-y-3 bg-gray-50">
                    {month.renewals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No renewals this month</p>
                      </div>
                    ) : (
                      month.renewals.map((renewal) => (
                        <div
                          key={renewal.id}
                          onClick={() => handleRenewalClick(renewal)}
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
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRenewal && (
        <RenewalDetailModal
          renewal={selectedRenewal}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRenewal(null);
          }}
          onUpdate={handleModalUpdate}
        />
      )}
    </div>
  );
}

// Simple modal component for renewal details
function RenewalDetailModal({ renewal, isOpen, onClose, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    engagement_status: renewal.engagement_status || 'not_started',
    renewal_probability: renewal.renewal_probability || 50,
    assigned_bd_manager: renewal.assigned_bd_manager || '',
    notes: renewal.notes || ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      await onUpdate(formData);
    } catch (error) {
      console.error('Error updating renewal:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Renewal Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Renewal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agency</label>
              <p className="text-gray-900">{renewal.agency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract End Date</label>
              <p className="text-gray-900">{formatDate(renewal.contract_end_date)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label>
              <p className="text-gray-900">
                {renewal.contract_value ? formatCurrency(renewal.contract_value) : 'Not specified'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incumbent Supplier</label>
              <p className="text-gray-900">{renewal.incumbent_supplier || 'Not specified'}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-900">{renewal.contract_description || 'No description available'}</p>
          </div>

          {/* Update Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engagement Status
              </label>
              <select
                value={formData.engagement_status}
                onChange={(e) => setFormData(prev => ({ ...prev, engagement_status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="not_started">Not Started</option>
                <option value="initial_contact">Initial Contact</option>
                <option value="relationship_building">Relationship Building</option>
                <option value="rfp_published">RFP Published</option>
                <option value="proposal_submitted">Proposal Submitted</option>
                <option value="evaluation">Under Evaluation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Renewal Probability ({formData.renewal_probability}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.renewal_probability}
                onChange={(e) => setFormData(prev => ({ ...prev, renewal_probability: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned BD Manager
              </label>
              <input
                type="text"
                value={formData.assigned_bd_manager}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_bd_manager: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter BD manager name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add notes about this renewal..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}