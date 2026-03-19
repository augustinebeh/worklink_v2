import { UserPlus, User } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function AssignmentModal({ isOpen, onClose, selectedCount, onAssign }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Assignment"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Assign {selectedCount} escalation(s) to:
        </p>

        <div className="space-y-2">
          <Button
            onClick={() => {
              onAssign(null);
              onClose();
            }}
            variant="outline"
            className="w-full justify-start"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Auto-assign to available admin
          </Button>

          <Button
            onClick={() => {
              onAssign('admin-1');
              onClose();
            }}
            variant="outline"
            className="w-full justify-start"
          >
            <User className="h-4 w-4 mr-2" />
            Assign to Admin 1
          </Button>

          <Button
            onClick={() => {
              onAssign('admin-2');
              onClose();
            }}
            variant="outline"
            className="w-full justify-start"
          >
            <User className="h-4 w-4 mr-2" />
            Assign to Admin 2
          </Button>
        </div>
      </div>
    </Modal>
  );
}
