/**
 * Tender Detail Modal Component
 * Displays comprehensive tender information with editing capabilities
 */

import { useState, useEffect } from 'react';
import {
  FileTextIcon,
  BuildingIcon,
  DollarSignIcon,
  ClockIcon,
  UserIcon,
  AlertCircleIcon,
  EditIcon,
  SaveIcon,
  XIcon
} from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useToast } from '../ui/Toast';

const STAGE_OPTIONS = [
  { value: 'renewal_watch', label: 'Renewal Watch' },
  { value: 'new_opportunity', label: 'New Opportunity' },
  { value: 'review', label: 'Review' },
  { value: 'bidding', label: 'Bidding' },
  { value: 'internal_approval', label: 'Internal Approval' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'awarded', label: 'Won' },
  { value: 'lost', label: 'Lost' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

export default function TenderDetailModal({
  isOpen,
  onClose,
  tender,
  onUpdate,
  onStageChange
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    agency: '',
    estimated_value: '',
    stage: '',
    priority: 'medium',
    assigned_to: '',
    closing_date: '',
    notes: '',
    our_bid_amount: '',
    win_probability: ''
  });

  const toast = useToast();

  // Initialize form data when tender changes
  useEffect(() => {
    if (tender) {
      setFormData({
        title: tender.title || '',
        agency: tender.agency || '',
        estimated_value: tender.estimated_value || '',
        stage: tender.stage || '',
        priority: tender.priority || 'medium',
        assigned_to: tender.assigned_to || '',
        closing_date: tender.closing_date ? tender.closing_date.split('T')[0] : '',
        notes: tender.notes || '',
        our_bid_amount: tender.our_bid_amount || '',
        win_probability: tender.win_probability || ''
      });
    }
  }, [tender]);

  // Reset editing state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (onUpdate) {
        onUpdate(tender.id, formData);
      }

      // Check if stage changed and call onStageChange
      if (formData.stage !== tender.stage && onStageChange) {
        onStageChange(tender.id, formData.stage);
      }

      toast.success('Tender Updated', 'Changes saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating tender:', error);
      toast.error('Update Failed', 'Unable to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (tender) {
      setFormData({
        title: tender.title || '',
        agency: tender.agency || '',
        estimated_value: tender.estimated_value || '',
        stage: tender.stage || '',
        priority: tender.priority || 'medium',
        assigned_to: tender.assigned_to || '',
        closing_date: tender.closing_date ? tender.closing_date.split('T')[0] : '',
        notes: tender.notes || '',
        our_bid_amount: tender.our_bid_amount || '',
        win_probability: tender.win_probability || ''
      });
    }
    setIsEditing(false);
  };

  const formatDeadline = (date) => {
    if (!date) return 'Not specified';
    const deadline = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days remaining`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!tender) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <FileTextIcon className="h-6 w-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold">Tender Details</h2>
            <p className="text-sm text-gray-600 font-normal">{tender.external_id || `ID: ${tender.id}`}</p>
          </div>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <Input
                label="Tender Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="text-lg font-semibold"
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">{tender.title}</h3>
            )}

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <BuildingIcon className="h-4 w-4" />
                {isEditing ? (
                  <Input
                    value={formData.agency}
                    onChange={(e) => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                    className="w-48"
                  />
                ) : (
                  <span>{tender.agency}</span>
                )}
              </div>

              <div className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getPriorityColor(tender.priority)}`}>
                {tender.priority}
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>{formatDeadline(tender.closing_date)}</span>
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

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSignIcon className="h-4 w-4 inline mr-1" />
                Estimated Value
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                  placeholder="Enter estimated value"
                />
              ) : (
                <p className="text-lg font-semibold text-emerald-600">
                  ${(tender.estimated_value || 0).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
              {isEditing ? (
                <Select
                  value={formData.stage}
                  onChange={(value) => setFormData(prev => ({ ...prev, stage: value }))}
                  options={STAGE_OPTIONS}
                />
              ) : (
                <p className="font-medium">{STAGE_OPTIONS.find(s => s.value === tender.stage)?.label || tender.stage}</p>
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(tender.priority)}`}>
                  {tender.priority}
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
                <p>{tender.assigned_to || 'Not assigned'}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Closing Date</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.closing_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, closing_date: e.target.value }))}
                />
              ) : (
                <p>{tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Our Bid Amount</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.our_bid_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, our_bid_amount: e.target.value }))}
                  placeholder="Enter bid amount"
                />
              ) : (
                <p className="font-semibold">
                  {tender.our_bid_amount ? `$${tender.our_bid_amount.toLocaleString()}` : 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Win Probability</label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.win_probability}
                  onChange={(e) => setFormData(prev => ({ ...prev, win_probability: e.target.value }))}
                  placeholder="0-100%"
                />
              ) : (
                <p className="font-semibold">
                  {tender.win_probability ? `${tender.win_probability}%` : 'Not assessed'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          {isEditing ? (
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add notes about this tender..."
            />
          ) : (
            <p className="text-gray-600 whitespace-pre-line">
              {tender.notes || 'No notes added yet.'}
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