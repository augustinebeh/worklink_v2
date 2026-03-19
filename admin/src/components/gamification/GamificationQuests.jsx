import { clsx } from 'clsx';
import {
  ZapIcon,
  TargetIcon,
  PlusIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Modal, { ModalFooter } from '../ui/Modal';

function QuestCard({ quest }) {
  const typeColors = {
    daily: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    weekly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    special: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className={clsx(
        'p-2 rounded-lg',
        quest.type === 'daily' ? 'bg-blue-100 dark:bg-blue-900/30' :
        quest.type === 'weekly' ? 'bg-purple-100 dark:bg-purple-900/30' :
        'bg-gold-100 dark:bg-gold-900/30'
      )}>
        <TargetIcon className={clsx(
          'h-5 w-5',
          quest.type === 'daily' ? 'text-blue-600 dark:text-blue-400' :
          quest.type === 'weekly' ? 'text-purple-600 dark:text-purple-400' :
          'text-gold-600 dark:text-gold-400'
        )} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900 dark:text-white">{quest.title}</h4>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium uppercase', typeColors[quest.type])}>
            {quest.type}
          </span>
          {quest.active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="error">Inactive</Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{quest.description}</p>
      </div>
      <div className="flex items-center gap-1 text-primary-600">
        <ZapIcon className="h-4 w-4" />
        <span className="font-semibold">+{quest.xp_reward}</span>
      </div>
    </div>
  );
}

export default function GamificationQuests({
  quests,
  showModal,
  setShowModal,
  form,
  setForm,
  onSave,
  saving,
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Quests ({quests.length})</CardTitle>
            <Button size="sm" icon={PlusIcon} onClick={() => setShowModal(true)}>Add Quest</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quests.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Quest Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Quest"
        description="Create a new quest for workers to complete"
      >
        <div className="space-y-4">
          <Input
            label="Quest Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Complete 3 Jobs This Week"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Complete 3 jobs within the current week"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Quest Type"
              value={form.type}
              onChange={(value) => setForm({ ...form, type: value })}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'special', label: 'Special' },
              ]}
            />
            <Input
              label="XP Reward"
              type="number"
              value={form.xp_reward}
              onChange={(e) => setForm({ ...form, xp_reward: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="questActive"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="questActive" className="text-sm text-slate-700 dark:text-slate-300">
              Active (visible to workers)
            </label>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={onSave} loading={saving}>Create Quest</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
