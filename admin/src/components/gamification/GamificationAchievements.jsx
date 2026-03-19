import { useState } from 'react';
import { clsx } from 'clsx';
import {
  ZapIcon,
  SearchIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Modal, { ModalFooter } from '../ui/Modal';

const rarityConfig = {
  common: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Common' },
  rare: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Rare' },
  epic: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Epic' },
  legendary: { color: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400', label: 'Legendary' },
};

function AchievementCard({ achievement }) {
  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="text-3xl">{achievement.icon || '🏅'}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900 dark:text-white">{achievement.name}</h4>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', rarity.color)}>
            {rarity.label}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{achievement.description}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 text-primary-600">
          <ZapIcon className="h-4 w-4" />
          <span className="font-semibold">+{achievement.xp_reward}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{achievement.unlocked_count || 0} earned</p>
      </div>
    </div>
  );
}

export default function GamificationAchievements({
  achievements,
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
            <CardTitle>All Achievements ({achievements.length})</CardTitle>
            <Input icon={SearchIcon} placeholder="Search..." className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {achievements.map(a => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Achievement Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Achievement"
        description="Create a new achievement for workers to unlock"
      >
        <div className="space-y-4">
          <Input
            label="Achievement Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., First Job Complete"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Complete your first job successfully"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon (emoji)"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="🏆"
            />
            <Input
              label="XP Reward"
              type="number"
              value={form.xp_reward}
              onChange={(e) => setForm({ ...form, xp_reward: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Select
            label="Rarity"
            value={form.rarity}
            onChange={(value) => setForm({ ...form, rarity: value })}
            options={[
              { value: 'common', label: 'Common' },
              { value: 'rare', label: 'Rare' },
              { value: 'epic', label: 'Epic' },
              { value: 'legendary', label: 'Legendary' },
            ]}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={onSave} loading={saving}>Create Achievement</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
