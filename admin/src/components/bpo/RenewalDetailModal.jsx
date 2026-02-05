/**
 * Renewal Detail Modal Component
 * Displays comprehensive renewal information with activity tracking and editing capabilities
 */

import { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  BuildingIcon,
  DollarSignIcon,
  ClockIcon,
  UserIcon,
  AlertCircleIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  CalendarIcon,
  FileTextIcon,
  ActivityIcon
} from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useToast } from '../ui/Toast';

const ENGAGEMENT_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'initial_contact', label: 'Initial Contact' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_submitted', label: 'Proposal Submitted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'contract_signed', label: 'Contract Signed' },
  { value: 'lost', label: 'Lost' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

export default function RenewalDetailModal({
  isOpen,
  onClose,
  renewal,
  onUpdate,
  onActivityAdd
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [newActivity, setNewActivity] = useState('');
  const [formData, setFormData] = useState({
    contract_description: '',
    agency: '',
    contract_value: '',
    contract_start_date: '',
    contract_end_date: '',
    renewal_probability: '',
    engagement_status: 'not_started',
    priority: 'medium',
    assigned_to: '',
    notes: '',
    key_contacts: '',
    competitor_info: '',
    pricing_strategy: ''
  });

  const toast = useToast();

  // Initialize form data when renewal changes
  useEffect(() => {
    if (renewal) {
      setFormData({
        contract_description: renewal.contract_description || '',
        agency: renewal.agency || '',
        contract_value: renewal.contract_value || '',
        contract_start_date: renewal.contract_start_date ? renewal.contract_start_date.split('T')[0] : '',
        contract_end_date: renewal.contract_end_date ? renewal.contract_end_date.split('T')[0] : '',
        renewal_probability: renewal.renewal_probability || '',
        engagement_status: renewal.engagement_status || 'not_started',
        priority: renewal.priority || 'medium',
        assigned_to: renewal.assigned_to || '',
        notes: renewal.notes || '',
        key_contacts: renewal.key_contacts || '',
        competitor_info: renewal.competitor_info || '',
        pricing_strategy: renewal.pricing_strategy || ''
      });
    }
  }, [renewal]);

  // Reset editing state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setActiveTab('overview');
      setNewActivity('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onUpdate) {
        onUpdate(renewal.id, formData);
      }

      toast.success('Renewal Updated', 'Changes saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating renewal:', error);
      toast.error('Update Failed', 'Unable to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (renewal) {
      setFormData({
        contract_description: renewal.contract_description || '',
        agency: renewal.agency || '',
        contract_value: renewal.contract_value || '',
        contract_start_date: renewal.contract_start_date ? renewal.contract_start_date.split('T')[0] : '',
        contract_end_date: renewal.contract_end_date ? renewal.contract_end_date.split('T')[0] : '',
        renewal_probability: renewal.renewal_probability || '',
        engagement_status: renewal.engagement_status || 'not_started',
        priority: renewal.priority || 'medium',
        assigned_to: renewal.assigned_to || '',
        notes: renewal.notes || '',
        key_contacts: renewal.key_contacts || '',
        competitor_info: renewal.competitor_info || '',
        pricing_strategy: renewal.pricing_strategy || ''
      });
    }
    setIsEditing(false);
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim()) return;

    try {
      const activity = {
        id: Date.now(),
        activity: newActivity,
        created_at: new Date().toISOString(),
        created_by: 'Admin User' // Replace with actual user
      };

      if (onActivityAdd) {
        onActivityAdd(renewal.id, activity);
      }

      setNewActivity('');
      toast.success('Activity Added', 'New activity logged successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed', 'Unable to add activity');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-SG');
  };

  const getMonthsUntilExpiry = (endDate) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diffMonths = Math.ceil((end - now) / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
  };

  const getUrgencyBadge = (months) => {
    if (months < 0) return { color: 'bg-red-100 text-red-800', text: 'Overdue' };
    if (months <= 3) return { color: 'bg-orange-100 text-orange-800', text: 'Imminent' };
    if (months <= 6) return { color: 'bg-yellow-100 text-yellow-800', text: 'Approaching' };
    return { color: 'bg-blue-100 text-blue-800', text: 'Future' };
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!renewal) return null;

  const monthsUntilExpiry = getMonthsUntilExpiry(renewal.contract_end_date);
  const urgencyBadge = getUrgencyBadge(monthsUntilExpiry);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <TrendingUpIcon className="h-6 w-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold">Contract Renewal</h2>
            <p className="text-sm text-gray-600 font-normal">{renewal.agency}</p>
          </div>
        </div>
      }
      maxWidth="5xl"
    >
      <div className="space-y-6">
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
                onClick={() => setIsEditing(true)}
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FileTextIcon },
              { id: 'activities', label: 'Activities', icon: ActivityIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Dates</label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium">{formatDate(renewal.contract_start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium">{formatDate(renewal.contract_end_date)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Status</label>
                {isEditing ? (
                  <Select
                    value={formData.engagement_status}
                    onChange={(value) => setFormData(prev => ({ ...prev, engagement_status: value }))}
                    options={ENGAGEMENT_STATUS_OPTIONS}
                  />
                ) : (
                  <span className="font-medium">
                    {ENGAGEMENT_STATUS_OPTIONS.find(s => s.value === renewal.engagement_status)?.label || renewal.engagement_status}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserIcon className="h-4 w-4 inline mr-1" />
                  Assigned To
                </label>
                {isEditing ? (
                  <Input
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    placeholder="Assign to team member"
                  />
                ) : (
                  <p>{renewal.assigned_to || 'Not assigned'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Contacts</label>
                {isEditing ? (
                  <textarea
                    value={formData.key_contacts}
                    onChange={(e) => setFormData(prev => ({ ...prev, key_contacts: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Key contact persons and their roles..."
                  />
                ) : (
                  <p className="text-gray-600 whitespace-pre-line">
                    {renewal.key_contacts || 'No contacts specified.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Renewal Probability</label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.renewal_probability}
                    onChange={(e) => setFormData(prev => ({ ...prev, renewal_probability: e.target.value }))}
                    placeholder="0-100%"
                  />
                ) : (
                  <p className={`text-2xl font-bold ${getProbabilityColor(renewal.renewal_probability)}`}>
                    {renewal.renewal_probability}%
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                {isEditing ? (
                  <Select
                    value={formData.priority}
                    onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    options={PRIORITY_OPTIONS}
                  />
                ) : (
                  <span className="font-medium capitalize">{renewal.priority}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Competitor Information</label>
                {isEditing ? (
                  <textarea
                    value={formData.competitor_info}
                    onChange={(e) => setFormData(prev => ({ ...prev, competitor_info: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Known competitors and their strategies..."
                  />
                ) : (
                  <p className="text-gray-600 whitespace-pre-line">
                    {renewal.competitor_info || 'No competitor information available.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Strategy</label>
                {isEditing ? (
                  <textarea
                    value={formData.pricing_strategy}
                    onChange={(e) => setFormData(prev => ({ ...prev, pricing_strategy: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Pricing approach and strategy notes..."
                  />
                ) : (
                  <p className="text-gray-600 whitespace-pre-line">
                    {renewal.pricing_strategy || 'No pricing strategy defined.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-4">
            {/* Add New Activity */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Log New Activity</label>
              <div className="flex gap-3">
                <textarea
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  rows="2"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the activity, meeting, or update..."
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddActivity}
                  disabled={!newActivity.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recent Activities</h4>
              {(renewal.activities || []).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activities logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {(renewal.activities || []).map((activity, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-white border rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.activity}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.created_at).toLocaleString()} by {activity.created_by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          {isEditing ? (
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Additional notes about this renewal..."
            />
          ) : (
            <p className="text-gray-600 whitespace-pre-line">
              {renewal.notes || 'No notes added yet.'}
            </p>
          )}
        </div>
      </div>

      <ModalFooter>
        {isEditing ? (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              icon={XIcon}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={loading}
              icon={SaveIcon}
            >
              Save Changes
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </ModalFooter>
    </Modal>
  );
}