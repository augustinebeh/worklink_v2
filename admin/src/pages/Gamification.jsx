import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ZapIcon,
  FlameIcon,
  StarIcon,
  TargetIcon,
  GiftIcon,
  UsersIcon,
  TrendingUpIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal, { ModalFooter } from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { clsx } from 'clsx';

const rarityConfig = {
  common: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Common' },
  rare: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Rare' },
  epic: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Epic' },
  legendary: { color: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400', label: 'Legendary' },
};

function StatCard({ icon: Icon, label, value, color = 'primary', trend }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    gold: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-sm',
            trend > 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            <TrendingUpIcon className={clsx('h-4 w-4', trend < 0 && 'rotate-180')} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
}

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

function LeaderboardTable({ data }) {
  return (
    <div className="space-y-2">
      {data.map((user, idx) => (
        <div 
          key={user.id}
          className={clsx(
            'flex items-center gap-4 p-3 rounded-xl',
            idx === 0 ? 'bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800' :
            idx === 1 ? 'bg-slate-100 dark:bg-slate-700/50' :
            idx === 2 ? 'bg-amber-50 dark:bg-amber-900/20' :
            'bg-slate-50 dark:bg-slate-800/50'
          )}
        >
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
            idx === 0 ? 'bg-gold-500 text-white' :
            idx === 1 ? 'bg-slate-400 text-white' :
            idx === 2 ? 'bg-amber-600 text-white' :
            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          )}>
            {idx + 1}
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
            {user.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
            <p className="text-sm text-slate-500">Level {user.level}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary-600">{user.xp?.toLocaleString()} XP</p>
            {user.streak_days > 0 && (
              <div className="flex items-center gap-1 text-orange-500 text-sm">
                <FlameIcon className="h-3 w-3" />
                <span>{user.streak_days}d streak</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Gamification() {
  const [achievements, setAchievements] = useState([]);
  const [quests, setQuests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [achievementForm, setAchievementForm] = useState({
    name: '',
    description: '',
    icon: '🏆',
    xp_reward: 100,
    rarity: 'common',
  });
  const [questForm, setQuestForm] = useState({
    title: '',
    description: '',
    type: 'daily',
    xp_reward: 50,
    active: true,
  });
  const [schemeForm, setSchemeForm] = useState({
    name: '',
    description: '',
    bonus_amount: 20,
    condition: '',
    active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // TODO: Create gamificationService - using raw client for now
      const [achievementsData, questsData, leaderboardData] = await Promise.all([
        api.client.get('/gamification/achievements'),
        api.client.get('/gamification/quests'),
        api.client.get('/gamification/leaderboard', { params: { limit: 10 } }),
      ]);

      if (achievementsData.success) setAchievements(achievementsData.data);
      if (questsData.success) setQuests(questsData.data);
      if (leaderboardData.success) setLeaderboard(leaderboardData.data);

      // Calculate stats
      const totalXP = leaderboardData.data?.reduce((sum, u) => sum + (u.xp || 0), 0) || 0;
      setStats({
        totalXP,
        avgLevel: leaderboardData.data?.length > 0
          ? (leaderboardData.data.reduce((sum, u) => sum + (u.level || 1), 0) / leaderboardData.data.length).toFixed(1)
          : 0,
        activeStreaks: leaderboardData.data?.filter(u => u.streak_days > 0).length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAchievement = async () => {
    setSaving(true);
    try {
      // TODO: Create gamificationService - using raw client for now
      const data = await api.client.post('/gamification/achievements', achievementForm);
      if (data.success) {
        setShowAchievementModal(false);
        setAchievementForm({ name: '', description: '', icon: '🏆', xp_reward: 100, rarity: 'common' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save achievement:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuest = async () => {
    setSaving(true);
    try {
      // TODO: Create gamificationService - using raw client for now
      const data = await api.client.post('/gamification/quests', questForm);
      if (data.success) {
        setShowQuestModal(false);
        setQuestForm({ title: '', description: '', type: 'daily', xp_reward: 50, active: true });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save quest:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScheme = async () => {
    setSaving(true);
    try {
      // TODO: Create gamificationService - using raw client for now
      const data = await api.client.post('/gamification/incentives', schemeForm);
      if (data.success) {
        setShowSchemeModal(false);
        setSchemeForm({ name: '', description: '', bonus_amount: 20, condition: '', active: true });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save scheme:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'quests', label: 'Quests' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'incentives', label: 'Incentives' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gamification</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage achievements, quests, and worker incentives
          </p>
        </div>
        <Button icon={PlusIcon} onClick={() => setShowAchievementModal(true)}>Add Achievement</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ZapIcon} label="Total XP Earned" value={stats.totalXP?.toLocaleString()} color="primary" trend={12} />
        <StatCard icon={TrophyIcon} label="Achievements" value={achievements.length} color="gold" />
        <StatCard icon={TargetIcon} label="Active Quests" value={quests.filter(q => q.active).length} color="success" />
        <StatCard icon={FlameIcon} label="Active Streaks" value={stats.activeStreaks} color="warning" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardTable data={leaderboard.slice(0, 5)} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Popular Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.slice(0, 4).map(a => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'achievements' && (
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
      )}

      {activeTab === 'quests' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Quests ({quests.length})</CardTitle>
              <Button size="sm" icon={PlusIcon} onClick={() => setShowQuestModal(true)}>Add Quest</Button>
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
      )}

      {activeTab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle>Global Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardTable data={leaderboard} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'incentives' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Incentive Schemes</CardTitle>
              <Button size="sm" icon={PlusIcon} onClick={() => setShowSchemeModal(true)}>Add Scheme</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GiftIcon className="h-6 w-6 text-emerald-600" />
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">Consistency Bonus</h4>
                      <p className="text-sm text-slate-500">$20 bonus for 5+ jobs per month</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StarIcon className="h-6 w-6 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">Perfect Rating Bonus</h4>
                      <p className="text-sm text-slate-500">$5 bonus for 5-star ratings</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UsersIcon className="h-6 w-6 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">Referral Bonus</h4>
                      <p className="text-sm text-slate-500">$30 for each successful referral</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Achievement Modal */}
      <Modal
        isOpen={showAchievementModal}
        onClose={() => setShowAchievementModal(false)}
        title="Add Achievement"
        description="Create a new achievement for workers to unlock"
      >
        <div className="space-y-4">
          <Input
            label="Achievement Name"
            value={achievementForm.name}
            onChange={(e) => setAchievementForm({ ...achievementForm, name: e.target.value })}
            placeholder="e.g., First Job Complete"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={achievementForm.description}
              onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
              placeholder="e.g., Complete your first job successfully"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon (emoji)"
              value={achievementForm.icon}
              onChange={(e) => setAchievementForm({ ...achievementForm, icon: e.target.value })}
              placeholder="🏆"
            />
            <Input
              label="XP Reward"
              type="number"
              value={achievementForm.xp_reward}
              onChange={(e) => setAchievementForm({ ...achievementForm, xp_reward: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Select
            label="Rarity"
            value={achievementForm.rarity}
            onChange={(value) => setAchievementForm({ ...achievementForm, rarity: value })}
            options={[
              { value: 'common', label: 'Common' },
              { value: 'rare', label: 'Rare' },
              { value: 'epic', label: 'Epic' },
              { value: 'legendary', label: 'Legendary' },
            ]}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAchievementModal(false)}>Cancel</Button>
          <Button onClick={handleSaveAchievement} loading={saving}>Create Achievement</Button>
        </ModalFooter>
      </Modal>

      {/* Add Quest Modal */}
      <Modal
        isOpen={showQuestModal}
        onClose={() => setShowQuestModal(false)}
        title="Add Quest"
        description="Create a new quest for workers to complete"
      >
        <div className="space-y-4">
          <Input
            label="Quest Title"
            value={questForm.title}
            onChange={(e) => setQuestForm({ ...questForm, title: e.target.value })}
            placeholder="e.g., Complete 3 Jobs This Week"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={questForm.description}
              onChange={(e) => setQuestForm({ ...questForm, description: e.target.value })}
              placeholder="e.g., Complete 3 jobs within the current week"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Quest Type"
              value={questForm.type}
              onChange={(value) => setQuestForm({ ...questForm, type: value })}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'special', label: 'Special' },
              ]}
            />
            <Input
              label="XP Reward"
              type="number"
              value={questForm.xp_reward}
              onChange={(e) => setQuestForm({ ...questForm, xp_reward: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="questActive"
              checked={questForm.active}
              onChange={(e) => setQuestForm({ ...questForm, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="questActive" className="text-sm text-slate-700 dark:text-slate-300">
              Active (visible to workers)
            </label>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowQuestModal(false)}>Cancel</Button>
          <Button onClick={handleSaveQuest} loading={saving}>Create Quest</Button>
        </ModalFooter>
      </Modal>

      {/* Add Incentive Scheme Modal */}
      <Modal
        isOpen={showSchemeModal}
        onClose={() => setShowSchemeModal(false)}
        title="Add Incentive Scheme"
        description="Create a new incentive scheme for workers"
      >
        <div className="space-y-4">
          <Input
            label="Scheme Name"
            value={schemeForm.name}
            onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
            placeholder="e.g., Consistency Bonus"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={schemeForm.description}
              onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
              placeholder="e.g., $20 bonus for completing 5+ jobs per month"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bonus Amount ($)"
              type="number"
              value={schemeForm.bonus_amount}
              onChange={(e) => setSchemeForm({ ...schemeForm, bonus_amount: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Condition"
              value={schemeForm.condition}
              onChange={(e) => setSchemeForm({ ...schemeForm, condition: e.target.value })}
              placeholder="e.g., 5+ jobs/month"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="schemeActive"
              checked={schemeForm.active}
              onChange={(e) => setSchemeForm({ ...schemeForm, active: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="schemeActive" className="text-sm text-slate-700 dark:text-slate-300">
              Active (applying to workers)
            </label>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowSchemeModal(false)}>Cancel</Button>
          <Button onClick={handleSaveScheme} loading={saving}>Create Scheme</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
