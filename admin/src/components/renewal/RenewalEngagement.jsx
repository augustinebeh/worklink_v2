import { useState } from 'react';
import {
  Calendar,
  User,
  CheckCircle,
  Plus,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input, { Textarea } from '../ui/Input';
import Modal from '../ui/Modal';
import { formatDate } from '../../shared/utils/formatters';
import { clsx } from 'clsx';

function ActionChecklist({ actionItems = [], onUpdateItem, onAddItem }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
    priority: 'medium'
  });

  const handleToggleComplete = async (itemId, completed) => {
    try {
      await onUpdateItem(itemId, { completed });
    } catch (error) {
      // Failed to update action item
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAddItem(newItem);
      setNewItem({
        title: '',
        description: '',
        due_date: '',
        assigned_to: '',
        priority: 'medium'
      });
      setShowAddModal(false);
    } catch (error) {
      // Failed to add action item
    }
  };

  const priorityColors = {
    high: 'text-red-600 bg-red-100',
    medium: 'text-amber-600 bg-amber-100',
    low: 'text-green-600 bg-green-100'
  };

  const completedCount = actionItems.filter(item => item.completed).length;
  const completionPercent = actionItems.length ? Math.round((completedCount / actionItems.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Action Items</h3>
          <p className="text-sm text-slate-500">
            {completedCount} of {actionItems.length} completed ({completionPercent}%)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)} icon={Plus}>
          Add Item
        </Button>
      </div>

      {/* Progress bar */}
      {actionItems.length > 0 && (
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      )}

      <div className="space-y-3">
        {actionItems.map((item) => {
          const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.completed;

          return (
            <div
              key={item.id}
              className={clsx(
                'flex items-start gap-3 p-4 rounded-lg border',
                item.completed
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : isOverdue
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}
            >
              <button
                onClick={() => handleToggleComplete(item.id, !item.completed)}
                className={clsx(
                  'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  item.completed
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                )}
              >
                {item.completed && <CheckCircle className="h-3 w-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={clsx(
                      'font-medium',
                      item.completed
                        ? 'text-slate-500 line-through'
                        : 'text-slate-900 dark:text-white'
                    )}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      {item.due_date && (
                        <div className={clsx(
                          'flex items-center gap-1',
                          isOverdue && 'text-red-600'
                        )}>
                          <Calendar className="h-3 w-3" />
                          <span>Due {formatDate(item.due_date)}</span>
                          {isOverdue && <AlertTriangle className="h-3 w-3" />}
                        </div>
                      )}
                      {item.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{item.assigned_to}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={clsx('ml-3', priorityColors[item.priority])}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}

        {actionItems.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No action items yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowAddModal(true)}
            >
              Add first item
            </Button>
          </div>
        )}
      </div>

      {/* Add Action Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Action Item"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g., Prepare technical proposal"
            value={newItem.title}
            onChange={(e) => setNewItem({...newItem, title: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Additional details..."
            value={newItem.description}
            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={newItem.due_date}
              onChange={(e) => setNewItem({...newItem, due_date: e.target.value})}
            />
            <Input
              label="Assigned To"
              placeholder="Person responsible"
              value={newItem.assigned_to}
              onChange={(e) => setNewItem({...newItem, assigned_to: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <select
              className="input"
              value={newItem.priority}
              onChange={(e) => setNewItem({...newItem, priority: e.target.value})}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function RenewalEngagement({ actionItems, onUpdateItem, onAddItem }) {
  return (
    <Card>
      <CardContent>
        <ActionChecklist
          actionItems={actionItems}
          onUpdateItem={onUpdateItem}
          onAddItem={onAddItem}
        />
      </CardContent>
    </Card>
  );
}
