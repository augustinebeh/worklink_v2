import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Beaker,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '../shared/services/api';
import { clsx } from 'clsx';
import { OverviewPanel, TimingPanel } from '../components/ads/AdPerformanceCharts';
import { ABTestsPanel, TrainingDataPanel } from '../components/ads/AdCampaignList';
import AdOptimizationPanel from '../components/ads/AdOptimizationPanel';

export default function AdOptimization() {
  const [stats, setStats] = useState(null);
  const [variables, setVariables] = useState({ scores: [], available: [] });
  const [timing, setTiming] = useState({ heatmap: null, suggestion: null });
  const [tests, setTests] = useState([]);
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchVariables(),
      fetchTiming(),
      fetchTests(),
      fetchTrainingData(),
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const data = await api.client.get('/ad-ml/stats');
      if (data.success) setStats(data.data);
    } catch (error) {
      // Failed to fetch stats
    }
  };

  const fetchVariables = async () => {
    try {
      const data = await api.client.get('/ad-ml/variables');
      if (data.success) setVariables(data.data);
    } catch (error) {
      // Failed to fetch variables
    }
  };

  const fetchTiming = async () => {
    try {
      const data = await api.client.get('/ad-ml/timing');
      if (data.success) setTiming(data.data);
    } catch (error) {
      // Failed to fetch timing
    }
  };

  const fetchTests = async () => {
    try {
      const data = await api.client.get('/ad-ml/tests');
      if (data.success) setTests(data.data);
    } catch (error) {
      // Failed to fetch tests
    }
  };

  const fetchTrainingData = async () => {
    try {
      const data = await api.client.get('/ad-ml/training-data', { params: { limit: 20 } });
      if (data.success) setTrainingData(data.data);
    } catch (error) {
      // Failed to fetch training data
    }
  };

  const evaluateTest = async (jobId) => {
    try {
      const data = await api.client.post(`/ad-ml/tests/${jobId}/evaluate`);
      if (data.success) {
        fetchTests();
        fetchStats();
      }
    } catch (error) {
      // Failed to evaluate test
    }
  };

  const exportTrainingData = async (format) => {
    try {
      const response = await fetch('/api/v1/ad-ml/training-data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad_training_data.${format === 'csv' ? 'csv' : format === 'huggingface' ? 'json' : 'jsonl'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // Failed to export
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'variables', label: 'Variable Insights', icon: Target },
    { id: 'timing', label: 'Timing', icon: Clock },
    { id: 'tests', label: 'A/B Tests', icon: Beaker },
    { id: 'training', label: 'Training Data', icon: TrendingUp },
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
            <Zap className="h-7 w-7 text-amber-500" />
            Ad Optimization
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            A/B testing and machine learning for job advertisements
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
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
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

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewPanel stats={stats} />}
      {activeTab === 'variables' && <AdOptimizationPanel variables={variables} />}
      {activeTab === 'timing' && <TimingPanel timing={timing} />}
      {activeTab === 'tests' && <ABTestsPanel tests={tests} onEvaluateTest={evaluateTest} />}
      {activeTab === 'training' && (
        <TrainingDataPanel
          stats={stats}
          trainingData={trainingData}
          onExportTrainingData={exportTrainingData}
        />
      )}
    </div>
  );
}
