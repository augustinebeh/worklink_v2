import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ZapIcon,
  FlameIcon,
  StarIcon,
  TargetIcon,
  GiftIcon,
  UsersIcon,
  PlusIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal, { ModalFooter } from '../components/ui/Modal';
import { clsx } from 'clsx';

import GamificationOverview, { StatCard, LeaderboardTable } from '../components/gamification/GamificationOverview';
import GamificationAchievements from '../components/gamification/GamificationAchievements';
import GamificationQuests from '../components/gamification/GamificationQuests';

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
      const [achievementsData, questsData, leaderboardData] = await Promise.all([
        api.client.get('/gamification/achievements'),
        api.client.get('/gamification/quests'),
        api.client.get('/gamification/leaderboard', { params: { limit: 10 } }),
      ]);

      if (achievementsData.success) setAchievements(achievementsData.data);
      if (questsData.success) setQuests(questsData.data);
      if (leaderboardData.success) setLeaderboard(leaderboardData.data);

      const totalXP = leaderboardData.data?.reduce((sum, u) => sum + (u.xp || 0), 0) || 0;
      setStats({
        totalXP,
        avgLevel: leaderboardData.data?.length > 0
          ? (leaderboardData.data.reduce((sum, u) => sum + (u.level || 1), 0) / leaderboardData.data.length).toFixed(1)
          : 0,
        activeStreaks: leaderboardData.data?.filter(u => u.streak_days > 0).length || 0,
      });
    } catch (error) {
      // Failed to fetch gamification data
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAchievement = async () => {
    setSaving(true);
    try {
      const data = await api.client.post('/gamification/achievements', achievementForm);
      if (data.success) {
        setShowAchievementModal(false);
        setAchievementForm({ name: '', description: '', icon: '🏆', xp_reward: 100, rarity: 'common' });
        fetchData();
      }
    } catch (error) {
      // Failed to save achievement
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuest = async () => {
    setSaving(true);
    try {
      const data = await api.client.post('/gamification/quests', questForm);
      if (data.success) {
        setShowQuestModal(false);
        setQuestForm({ title: '', description: '', type: 'daily', xp_reward: 50, active: true });
        fetchData();
      }
    } catch (error) {
      // Failed to save quest
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScheme = async () => {
    setSaving(true);
    try {
      const data = await api.client.post('/gamification/incentives', schemeForm);
      if (data.success) {
        setShowSchemeModal(false);
        setSchemeForm({ name: '', description: '', bonus_amount: 20, condition: '', active: true });
        fetchData();
      }
    } catch (error) {
      // Failed to save scheme
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
        <GamificationOverview leaderboard={leaderboard} achievements={achievements} />
      )}

      {activeTab === 'achievements' && (
        <GamificationAchievements
          achievements={achievements}
          showModal={showAchievementModal}
          setShowModal={setShowAchievementModal}
          form={achievementForm}
          setForm={setAchievementForm}
          onSave={handleSaveAchievement}
          saving={saving}
        />
      )}

      {activeTab === 'quests' && (
        <GamificationQuests
          quests={quests}
          showModal={showQuestModal}
          setShowModal={setShowQuestModal}
          form={questForm}
          setForm={setQuestForm}
          onSave={handleSaveQuest}
          saving={saving}
        />
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
        <>
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
        </>
      )}
    </div>
  );
}
