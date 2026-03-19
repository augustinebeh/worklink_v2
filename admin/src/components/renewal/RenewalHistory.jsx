import { useState } from 'react';
import {
  Phone,
  Mail,
  FileText,
  Presentation,
  Clock,
  TrendingUp,
  Plus,
  ClipboardList
} from 'lucide-react';
import Card, { CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input, { Textarea } from '../ui/Input';
import Modal from '../ui/Modal';
import { formatDate } from '../../shared/utils/formatters';
import { clsx } from 'clsx';

const ACTIVITY_ICONS = {
  meeting: Presentation,
  call: Phone,
  email: Mail,
  proposal: FileText,
  follow_up: Clock,
  demo: TrendingUp
};

const ACTIVITY_COLORS = {
  meeting: 'text-blue-500 bg-blue-100',
  call: 'text-green-500 bg-green-100',
  email: 'text-purple-500 bg-purple-100',
  proposal: 'text-orange-500 bg-orange-100',
  follow_up: 'text-amber-500 bg-amber-100',
  demo: 'text-emerald-500 bg-emerald-100'
};

function ActivityTimeline({ activities = [], onAddActivity }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'meeting',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    outcome: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAddActivity(newActivity);
      setNewActivity({
        type: 'meeting',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        outcome: ''
      });
      setShowAddModal(false);
    } catch (error) {
      // Failed to add activity
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Activity Timeline</h3>
        <Button size="sm" onClick={() => setShowAddModal(true)} icon={Plus}>
          Add Activity
        </Button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-6">
          {activities.map((activity, index) => {
            const IconComponent = ACTIVITY_ICONS[activity.type] || FileText;
            return (
              <div key={activity.id || index} className="relative flex items-start gap-4">
                <div className={clsx(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900',
                  ACTIVITY_COLORS[activity.type] || 'text-slate-500 bg-slate-100'
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{activity.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{activity.description}</p>
                      {activity.outcome && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Outcome:</span> {activity.outcome}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end text-sm text-slate-400">
                      <span>{formatDate(activity.date)}</span>
                      <Badge variant="info" className="mt-1 capitalize">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activities recorded yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddModal(true)}
              >
                Add first activity
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Activity"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Activity Type
              </label>
              <select
                className="input"
                value={newActivity.type}
                onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}
                required
              >
                <option value="meeting">Meeting</option>
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="proposal">Proposal</option>
                <option value="follow_up">Follow-up</option>
                <option value="demo">Demo/Presentation</option>
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={newActivity.date}
              onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
              required
            />
          </div>

          <Input
            label="Activity Title"
            placeholder="e.g., Initial meeting with procurement team"
            value={newActivity.title}
            onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Details about the activity..."
            value={newActivity.description}
            onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
            rows={3}
          />

          <Textarea
            label="Outcome/Notes"
            placeholder="What was achieved? Next steps?"
            value={newActivity.outcome}
            onChange={(e) => setNewActivity({...newActivity, outcome: e.target.value})}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Activity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function RenewalHistory({ activities, onAddActivity }) {
  return (
    <Card>
      <CardContent>
        <ActivityTimeline
          activities={activities}
          onAddActivity={onAddActivity}
        />
      </CardContent>
    </Card>
  );
}
