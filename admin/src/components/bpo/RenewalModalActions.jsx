/**
 * Renewal Modal Actions Component
 * Footer action buttons for the renewal detail modal (save/cancel/close)
 */

import { SaveIcon, XIcon } from 'lucide-react';
import { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';

export default function RenewalModalActions({ isEditing, loading, onSave, onCancel, onClose }) {
  if (isEditing) {
    return (
      <ModalFooter>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            icon={XIcon}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            loading={loading}
            icon={SaveIcon}
          >
            Save Changes
          </Button>
        </div>
      </ModalFooter>
    );
  }

  return (
    <ModalFooter>
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </ModalFooter>
  );
}
