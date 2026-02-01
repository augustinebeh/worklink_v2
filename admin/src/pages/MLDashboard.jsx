import { useState, useEffect } from 'react';
import {
  Brain,
  Database,
  Zap,
  TrendingUp,
  DollarSign,
  MessageSquare,
  BookOpen,
  Download,
  RefreshCw,
  Settings,
  ChevronRight,
  Search,
  Edit3,
  Trash2,
  Plus,
  Check,
  X,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { clsx } from 'clsx';

// Stat card component
function StatCard({ icon: Icon, label, value, subValue, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  return (
    <Card className="flex items-center gap-4">
      <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {subValue && (
          <p className="text-xs text-slate-400">{subValue}</p>
        )}
      </div>
    </Card>
  );
}

// FAQ item component
function FAQItem({ faq, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant={faq.active ? 'success' : 'default'} size="xs">
            {faq.category}
          </Badge>
          <span className="text-sm font-medium text-slate-900 dark:text-white text-left">
            {faq.question}
          </span>
        </div>
        <ChevronRight className={clsx(
          'h-4 w-4 text-slate-400 transition-transform',
          expanded && 'rotate-90'
        )} />
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {faq.answer}
          </p>
          {faq.keywords && (
            <div className="flex flex-wrap gap-1 mb-3">
              {JSON.parse(faq.keywords || '[]').map((kw, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400">
                  {kw}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(faq)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={() => onDelete(faq.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MLDashboard() {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [responseLogs, setResponseLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // FAQ form state
  const [showFAQForm, setShowFAQForm] = useState(false);
  const [faqForm, setFaqForm] = useState({
    category: '',
    question: '',
    answer: '',
    keywords: '',
    priority: 0,
  });
  const [editingFAQ, setEditingFAQ] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchSettings(),
      fetchFAQs(),
      fetchKnowledgeBase(),
      fetchResponseLogs(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/ml/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch ML stats:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/ml/settings');
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (error) {
      console.error('Failed to fetch ML settings:', error);
    }
  };

  const fetchFAQs = async () => {
    try {
      const res = await fetch('/api/v1/ml/faq?activeOnly=false');
      const data = await res.json();
      if (data.success) setFaqs(data.data);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
    }
  };

  const fetchKnowledgeBase = async () => {
    try {
      const res = await fetch('/api/v1/ml/knowledge-base?limit=50');
      const data = await res.json();
      if (data.success) setKnowledgeBase(data.data);
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error);
    }
  };

  const fetchResponseLogs = async () => {
    try {
      const res = await fetch('/api/v1/ml/logs?limit=20');
      const data = await res.json();
      if (data.success) setResponseLogs(data.data);
    } catch (error) {
      console.error('Failed to fetch response logs:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await fetch('/api/v1/ml/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleFAQSubmit = async () => {
    try {
      const keywords = faqForm.keywords.split(',').map(k => k.trim()).filter(Boolean);

      if (editingFAQ) {
        await fetch(`/api/v1/ml/faq/${editingFAQ.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...faqForm, keywords }),
        });
      } else {
        await fetch('/api/v1/ml/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...faqForm, keywords }),
        });
      }

      setShowFAQForm(false);
      setEditingFAQ(null);
      setFaqForm({ category: '', question: '', answer: '', keywords: '', priority: 0 });
      fetchFAQs();
    } catch (error) {
      console.error('Failed to save FAQ:', error);
    }
  };

  const handleEditFAQ = (faq) => {
    setEditingFAQ(faq);
    setFaqForm({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      keywords: JSON.parse(faq.keywords || '[]').join(', '),
      priority: faq.priority || 0,
    });
    setShowFAQForm(true);
  };

  const handleDeleteFAQ = async (id) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await fetch(`/api/v1/ml/faq/${id}`, { method: 'DELETE' });
      fetchFAQs();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
    }
  };

  const exportTrainingData = async (format) => {
    try {
      const res = await fetch('/api/v1/ml/training-data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training_data.${format === 'csv' ? 'csv' : format === 'huggingface' ? 'json' : 'jsonl'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export training data:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'faq', label: 'FAQ Library', icon: BookOpen },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
    { id: 'logs', label: 'Response Logs', icon: MessageSquare },
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
            <Brain className="h-7 w-7 text-violet-500" />
            ML Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Machine learning knowledge base and performance
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
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

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Database}
              label="Knowledge Base Size"
              value={stats.kbSize || 0}
              subValue="Learned Q&A pairs"
              color="primary"
            />
            <StatCard
              icon={Zap}
              label="KB Hit Rate"
              value={`${((stats.kbHitRate || 0) * 100).toFixed(1)}%`}
              subValue="Answered without LLM"
              color="emerald"
            />
            <StatCard
              icon={MessageSquare}
              label="Total Responses"
              value={stats.totalResponses || 0}
              subValue={`${stats.llmCalls || 0} LLM calls`}
              color="violet"
            />
            <StatCard
              icon={DollarSign}
              label="Estimated Savings"
              value={`$${(stats.costSaved || 0).toFixed(2)}`}
              subValue="From KB hits"
              color="amber"
            />
          </div>

          {/* Training Stats */}
          {stats.training && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Training Data
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Examples</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.training.totalExamples}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Approved</p>
                  <p className="text-xl font-bold text-emerald-600">{stats.training.approvedExamples}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">High Quality</p>
                  <p className="text-xl font-bold text-violet-600">{stats.training.highQualityExamples}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Avg Quality</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.training.averageQuality}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => exportTrainingData('jsonl')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm hover:bg-primary-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export JSONL
                </button>
                <button
                  onClick={() => exportTrainingData('csv')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {faqs.length} FAQ entries
            </p>
            <button
              onClick={() => {
                setEditingFAQ(null);
                setFaqForm({ category: '', question: '', answer: '', keywords: '', priority: 0 });
                setShowFAQForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add FAQ
            </button>
          </div>

          <Card padding="none">
            {faqs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No FAQs yet</p>
              </div>
            ) : (
              faqs.map(faq => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  onEdit={handleEditFAQ}
                  onDelete={handleDeleteFAQ}
                />
              ))
            )}
          </Card>
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Learned Knowledge Base
            </h3>
          </div>

          {knowledgeBase.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Knowledge base is empty</p>
              <p className="text-sm mt-1">It will grow as the AI learns from conversations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {knowledgeBase.map(entry => (
                <div key={entry.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {entry.question}
                    </p>
                    <Badge
                      variant={entry.confidence >= 0.8 ? 'success' : entry.confidence >= 0.5 ? 'warning' : 'default'}
                      size="xs"
                    >
                      {Math.round(entry.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {entry.answer}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Used {entry.use_count || 0}x</span>
                    <span>Source: {entry.source}</span>
                    {entry.intent && <span>Intent: {entry.intent}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Response Logs Tab */}
      {activeTab === 'logs' && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent AI Responses
          </h3>

          {responseLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No response logs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {responseLogs.map(log => (
                <div key={log.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-l-4 border-l-primary-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={log.source === 'knowledge_base' ? 'success' : 'primary'} size="xs">
                        {log.source === 'knowledge_base' ? 'KB' : 'LLM'}
                      </Badge>
                      <Badge variant={log.status === 'sent' ? 'success' : 'warning'} size="xs">
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    <strong>Q:</strong> {log.incoming_message}
                  </p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    <strong>A:</strong> {log.ai_response}
                  </p>
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
            ML Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Knowledge Base Enabled</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use learned answers before calling LLM</p>
              </div>
              <button
                onClick={() => updateSetting('kb_enabled', !settings.kb_enabled)}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.kb_enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                )}
              >
                <div className={clsx(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  settings.kb_enabled ? 'left-7' : 'left-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Learn from LLM Responses</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Automatically add LLM responses to knowledge base</p>
              </div>
              <button
                onClick={() => updateSetting('learn_from_llm', !settings.learn_from_llm)}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors',
                  settings.learn_from_llm !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                )}
              >
                <div className={clsx(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  settings.learn_from_llm !== false ? 'left-7' : 'left-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Min Confidence Threshold</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Minimum confidence to use KB answer (0-1)</p>
              </div>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={settings.min_confidence || 0.75}
                onChange={(e) => updateSetting('min_confidence', parseFloat(e.target.value))}
                className="w-20 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </Card>
      )}

      {/* FAQ Form Modal */}
      {showFAQForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingFAQ ? 'Edit FAQ' : 'Add FAQ'}
              </h3>
              <button
                onClick={() => setShowFAQForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., payment, schedule, general"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="What question does this answer?"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Answer
                </label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="The answer to provide"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={faqForm.keywords}
                  onChange={(e) => setFaqForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="pay, salary, money"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowFAQForm(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFAQSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                <Check className="h-4 w-4" />
                {editingFAQ ? 'Save Changes' : 'Add FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
