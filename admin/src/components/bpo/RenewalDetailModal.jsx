/**
 * Renewal Detail Modal Component
 * Orchestrator shell that composes sub-components for renewal detail display and editing
 */

import { useState, useEffect } from 'react';
import { TrendingUpIcon } from 'lucide-react';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';
import RenewalModalHeader from './RenewalModalHeader';
import RenewalModalBody from './RenewalModalBody';
import RenewalModalActions from './RenewalModalActions';

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
      // Error updating renewal
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
      // Error adding activity
      toast.error('Failed', 'Unable to add activity');
    }
  };

  if (!renewal) return null;

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
        <RenewalModalHeader
          renewal={renewal}
          isEditing={isEditing}
          onEditClick={() => setIsEditing(true)}
        />

        <RenewalModalBody
          renewal={renewal}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          newActivity={newActivity}
          setNewActivity={setNewActivity}
          onAddActivity={handleAddActivity}
        />
      </div>

      <RenewalModalActions
        isEditing={isEditing}
        loading={loading}
        onSave={handleSave}
        onCancel={handleCancel}
        onClose={onClose}
      />
    </Modal>
  );
}
