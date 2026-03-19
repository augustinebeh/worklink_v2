/**
 * Tender Detail Modal Component
 * Orchestrator shell that composes sub-components for tender detail display and editing
 */

import { useState, useEffect } from 'react';
import {
  FileTextIcon,
  SaveIcon,
  XIcon
} from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import TenderModalInfo from './TenderModalInfo';
import TenderModalActivity from './TenderModalActivity';

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

  // Activity timeline
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Fetch activity log when tender changes
  useEffect(() => {
    if (tender?.id && isOpen) {
      const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
          const res = await fetch(`/api/v1/pipeline/${tender.id}`);
          const data = await res.json();
          if (data.success && data.data) {
            // Build activity from tender data
            const acts = [];
            if (data.data.created_at) {
              acts.push({ type: 'created', date: data.data.created_at, detail: 'Tender created' });
            }
            if (data.data.stage_updated_at && data.data.stage_updated_at !== data.data.created_at) {
              acts.push({ type: 'stage_change', date: data.data.stage_updated_at, detail: `Moved to ${data.data.stage?.replace(/_/g, ' ')}` });
            }
            if (data.data.decision_made_at) {
              acts.push({ type: 'decision', date: data.data.decision_made_at, detail: `Decision: ${data.data.decision} by ${data.data.decision_made_by || 'unknown'}` });
            }
            if (data.data.outcome_date) {
              acts.push({ type: 'outcome', date: data.data.outcome_date, detail: `Outcome: ${data.data.outcome}${data.data.winner ? ` (Winner: ${data.data.winner})` : ''}` });
            }
            acts.sort((a, b) => new Date(b.date) - new Date(a.date));
            setActivities(acts);
          }
        } catch (e) {
          // Error fetching activities
        } finally {
          setLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [tender?.id, isOpen]);

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
      const res = await fetch(`/api/v1/pipeline/${tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Update failed');

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
      // Error updating tender
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
        <TenderModalInfo
          tender={tender}
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          onEditClick={() => setIsEditing(true)}
        />

        {/* Activity Timeline */}
        {!isEditing && (
          <TenderModalActivity
            activities={activities}
            loadingActivities={loadingActivities}
          />
        )}
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
