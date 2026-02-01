import { useState, useEffect } from 'react';
import {
  Send as TelegramIcon,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Settings,
  MessageSquare,
  ExternalLink,
  Clock,
  Check,
  X,
  Eye,
  Zap,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { clsx } from 'clsx';

export default function TelegramGroups() {
  const [groups, setGroups] = useState([]);
  const [settings, setSettings] = useState({});
  const [postHistory, setPostHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ chatId: '', name: '', type: 'job_posting' });
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchGroups(),
      fetchSettings(),
      fetchHistory(),
    ]);
    setLoading(false);
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/v1/telegram-groups?activeOnly=false');
      const data = await res.json();
      if (data.success) setGroups(data.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/telegram-groups/settings');
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/v1/telegram-groups/history?limit=50');
      const data = await res.json();
      if (data.success) setPostHistory(data.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const updateSettings = async (updates) => {
    try {
      await fetch('/api/v1/telegram-groups/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSettings(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingGroup) {
        await fetch(`/api/v1/telegram-groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/v1/telegram-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowForm(false);
      setEditingGroup(null);
      setFormData({ chatId: '', name: '', type: 'job_posting' });
      fetchGroups();
    } catch (error) {
      console.error('Failed to save group:', error);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      chatId: group.chat_id,
      name: group.name,
      type: group.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this group?')) return;
    try {
      await fetch(`/api/v1/telegram-groups/${id}`, { method: 'DELETE' });
      fetchGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const toggleGroupActive = async (group) => {
    try {
      await fetch(`/api/v1/telegram-groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !group.active }),
      });
      fetchGroups();
    } catch (error) {
      console.error('Failed to toggle group:', error);
    }
  };

  const tabs = [
    { id: 'groups', label: 'Groups', icon: TelegramIcon },
    { id: 'history', label: 'Post History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <TelegramIcon className="h-7 w-7 text-sky-500" />
            Telegram Groups
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage job posting to Telegram groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!settings.telegramConfigured && (
            <Badge variant="warning">Telegram not configured</Badge>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {groups.filter(g => g.active).length} active groups
            </p>
            <button
              onClick={() => {
                setEditingGroup(null);
                setFormData({ chatId: '', name: '', type: 'job_posting' });
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white text-sm hover:bg-sky-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Group
            </button>
          </div>

          {groups.length === 0 ? (
            <Card className="text-center py-12">
              <TelegramIcon className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No Telegram groups configured</p>
              <p className="text-sm text-slate-400 mt-1">Add a group to start posting job ads</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(group => (
                <Card key={group.id} className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        group.active ? 'bg-sky-100 dark:bg-sky-900/30' : 'bg-slate-100 dark:bg-slate-800'
                      )}>
                        <TelegramIcon className={clsx(
                          'h-5 w-5',
                          group.active ? 'text-sky-500' : 'text-slate-400'
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {group.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {group.chat_id}
                        </p>
                      </div>
                    </div>
                    <Badge variant={group.active ? 'success' : 'default'} size="xs">
                      {group.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => toggleGroupActive(group)}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        group.active
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                      )}
                    >
                      {group.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Posts
          </h3>

          {postHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {postHistory.map(post => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <TelegramIcon className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {post.job_title || 'Unknown Job'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Posted to {post.group_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={post.status === 'sent' ? 'success' : post.status === 'deleted' ? 'danger' : 'default'}
                      size="xs"
                    >
                      {post.status}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(post.posted_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Auto-Post Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Enable Auto-Posting</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Automatically post new jobs to Telegram groups
                </p>
              </div>
              <button
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.enabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
                )}
              >
                <div className={clsx(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  settings.enabled ? 'left-7' : 'left-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Post on Job Create</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Automatically post when a new job is created
                </p>
              </div>
              <button
                onClick={() => updateSettings({ post_on_job_create: !settings.post_on_job_create })}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.post_on_job_create ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
                )}
              >
                <div className={clsx(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  settings.post_on_job_create ? 'left-7' : 'left-1'
                )} />
              </button>
            </div>

            <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-violet-500" />
                <span className="font-medium text-violet-700 dark:text-violet-300">A/B Testing</span>
              </div>
              <p className="text-sm text-violet-600 dark:text-violet-400">
                When posting to multiple groups, different ad variants will be tested to learn which performs best.
                Results are tracked in the Ad Optimization dashboard.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingGroup ? 'Edit Group' : 'Add Telegram Group'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., WorkLink Jobs Channel"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={formData.chatId}
                  onChange={(e) => setFormData(prev => ({ ...prev, chatId: e.target.value }))}
                  placeholder="e.g., -1001234567890"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  You can get this by adding @userinfobot to your group
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="job_posting">Job Posting</option>
                  <option value="announcements">Announcements</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.chatId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
                {editingGroup ? 'Save Changes' : 'Add Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
