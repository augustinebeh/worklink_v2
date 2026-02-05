/**
 * Create Tender Modal Component
 * Provides a form to create new tender entries with validation
 */

import { useState } from 'react';
import {
  PlusIcon,
  AlertCircleIcon,
  BuildingIcon,
  DollarSignIcon,
  ClockIcon,
  UserIcon
} from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useToast } from '../ui/Toast';
import { lifecycleService } from '../../shared/services/api';

const STAGE_OPTIONS = [
  { value: 'renewal_watch', label: 'Renewal Watch' },
  { value: 'new_opportunity', label: 'New Opportunity' },
  { value: 'review', label: 'Review' },
  { value: 'bidding', label: 'Bidding' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const SOURCE_OPTIONS = [
  { value: 'gebiz', label: 'GeBIZ' },
  { value: 'direct', label: 'Direct Contact' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' }
];

export default function CreateTenderModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    agency: '',
    external_id: '',
    estimated_value: '',
    stage: 'new_opportunity',
    priority: 'medium',
    source: 'gebiz',
    assigned_to: '',
    closing_date: '',
    description: '',
    requirements: '',
    notes: '',
    win_probability: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  // Reset form when modal opens/closes
  const resetForm = () => {
    setFormData({
      title: '',
      agency: '',
      external_id: '',
      estimated_value: '',
      stage: 'new_opportunity',
      priority: 'medium',
      source: 'gebiz',
      assigned_to: '',
      closing_date: '',
      description: '',
      requirements: '',
      notes: '',
      win_probability: ''
    });
    setErrors({});
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tender title is required';
    }

    if (!formData.agency.trim()) {
      newErrors.agency = 'Agency name is required';
    }

    if (formData.estimated_value && formData.estimated_value <= 0) {
      newErrors.estimated_value = 'Estimated value must be greater than 0';
    }

    if (formData.win_probability && (formData.win_probability < 0 || formData.win_probability > 100)) {
      newErrors.win_probability = 'Win probability must be between 0 and 100';
    }

    if (formData.closing_date) {
      const closingDate = new Date(formData.closing_date);
      const today = new Date();
      if (closingDate < today) {
        newErrors.closing_date = 'Closing date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Validation Error', 'Please fix the errors and try again');
      return;
    }

    setLoading(true);
    try {
      // Prepare tender data for API call
      const tenderData = {
        title: formData.title,
        agency: formData.agency,
        external_url: formData.external_id || null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        stage: formData.stage,
        priority: formData.priority,
        source_type: 'manual_entry',
        assigned_to: formData.assigned_to || null,
        description: formData.description || formData.notes || null,
        closing_date: formData.closing_date || null
      };

      console.log('🚀 Creating tender with data:', tenderData);

      // Call actual API to create tender
      const response = await lifecycleService.createTender(tenderData);

      console.log('📥 API Response:', response);

      if (response.success) {
        if (onSuccess) {
          onSuccess(response.data);
        }

        toast.success('Tender Created', 'New tender has been added successfully');
        resetForm();
        onClose();
      } else {
        throw new Error(response.error || 'Failed to create tender');
      }
    } catch (error) {
      console.error('❌ Error creating tender:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error('Creation Failed', 'Unable to create tender');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={
        <div className="flex items-center gap-3">
          <PlusIcon className="h-6 w-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold">Create New Tender</h2>
            <p className="text-sm text-gray-600 font-normal">Add a new tender to the pipeline</p>
          </div>
        </div>
      }
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Tender Title*"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter tender title"
              error={errors.title}
              required
            />

            <Input
              label="Agency*"
              icon={BuildingIcon}
              value={formData.agency}
              onChange={(e) => handleChange('agency', e.target.value)}
              placeholder="e.g., MOH, MOM, etc."
              error={errors.agency}
              required
            />

            <Input
              label="External ID"
              value={formData.external_id}
              onChange={(e) => handleChange('external_id', e.target.value)}
              placeholder="e.g., GeBIZ tender number"
              help="Optional reference ID from external source"
            />

            <Input
              label="Estimated Value"
              icon={DollarSignIcon}
              type="number"
              value={formData.estimated_value}
              onChange={(e) => handleChange('estimated_value', e.target.value)}
              placeholder="0.00"
              error={errors.estimated_value}
            />
          </div>

          <div className="space-y-4">
            <Select
              label="Initial Stage"
              value={formData.stage}
              onChange={(value) => handleChange('stage', value)}
              options={STAGE_OPTIONS}
            />

            <Select
              label="Priority"
              value={formData.priority}
              onChange={(value) => handleChange('priority', value)}
              options={PRIORITY_OPTIONS}
            />

            <Select
              label="Source"
              value={formData.source}
              onChange={(value) => handleChange('source', value)}
              options={SOURCE_OPTIONS}
            />

            <Input
              label="Assigned To"
              icon={UserIcon}
              value={formData.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              placeholder="Team member name"
            />
          </div>
        </div>

        {/* Dates and Probability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Closing Date"
            icon={ClockIcon}
            type="date"
            value={formData.closing_date}
            onChange={(e) => handleChange('closing_date', e.target.value)}
            error={errors.closing_date}
          />

          <Input
            label="Win Probability (%)"
            type="number"
            min="0"
            max="100"
            value={formData.win_probability}
            onChange={(e) => handleChange('win_probability', e.target.value)}
            placeholder="0-100"
            error={errors.win_probability}
          />
        </div>

        {/* Description and Requirements */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description of the tender..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements
            </label>
            <textarea
              value={formData.requirements}
              onChange={(e) => handleChange('requirements', e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Key requirements and qualifications..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Additional notes or comments..."
            />
          </div>
        </div>

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <ModalFooter>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={PlusIcon}
            >
              Create Tender
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}