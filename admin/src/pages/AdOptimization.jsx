import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Beaker,
  Download,
  RefreshCw,
  ChevronRight,
  Trophy,
  Zap,
  Calendar,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { clsx } from 'clsx';

// Stat card
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
        {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
      </div>
    </Card>
  );
}

// Timing heatmap cell
function HeatmapCell({ value, maxValue, hour, day }) {
  const intensity = maxValue > 0 ? value / maxValue : 0;

  return (
    <div
      className={clsx(
        'w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-default transition-colors',
        intensity === 0
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          : intensity < 0.25
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            : intensity < 0.5
              ? 'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300'
              : intensity < 0.75
                ? 'bg-emerald-400 dark:bg-emerald-700/60 text-white'
                : 'bg-emerald-600 dark:bg-emerald-600 text-white'
      )}
      title={`${day} ${hour}:00 - ${value} responses`}
    >
      {value > 0 ? value : ''}
    </div>
  );
}

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
      const res = await fetch('/api/v1/ad-ml/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchVariables = async () => {
    try {
      const res = await fetch('/api/v1/ad-ml/variables');
      const data = await res.json();
      if (data.success) setVariables(data.data);
    } catch (error) {
      console.error('Failed to fetch variables:', error);
    }
  };

  const fetchTiming = async () => {
    try {
      const res = await fetch('/api/v1/ad-ml/timing');
      const data = await res.json();
      if (data.success) setTiming(data.data);
    } catch (error) {
      console.error('Failed to fetch timing:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/v1/ad-ml/tests');
      const data = await res.json();
      if (data.success) setTests(data.data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };

  const fetchTrainingData = async () => {
    try {
      const res = await fetch('/api/v1/ad-ml/training-data?limit=20');
      const data = await res.json();
      if (data.success) setTrainingData(data.data);
    } catch (error) {
      console.error('Failed to fetch training data:', error);
    }
  };

  const evaluateTest = async (jobId) => {
    try {
      const res = await fetch(`/api/v1/ad-ml/tests/${jobId}/evaluate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchTests();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to evaluate test:', error);
    }
  };

  const exportTrainingData = async (format) => {
    try {
      const res = await fetch('/api/v1/ad-ml/training-data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad_training_data.${format === 'csv' ? 'csv' : format === 'huggingface' ? 'json' : 'jsonl'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'variables', label: 'Variable Insights', icon: Target },
    { id: 'timing', label: 'Timing', icon: Clock },
    { id: 'tests', label: 'A/B Tests', icon: Beaker },
    { id: 'training', label: 'Training Data', icon: TrendingUp },
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Beaker}
              label="Total Tests"
              value={stats.totalTests || 0}
              subValue={`${stats.totalVariants || 0} variants`}
              color="primary"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Responses"
              value={stats.totalResponses || 0}
              color="emerald"
            />
            <StatCard
              icon={Target}
              label="Avg Response Rate"
              value={`${((parseFloat(stats.avgResponseRate) || 0) * 100).toFixed(2)}%`}
              color="violet"
            />
            <StatCard
              icon={Trophy}
              label="Top Variables Learned"
              value={stats.topVariables?.length || 0}
              color="amber"
            />
          </div>

          {/* Top Performing Variables */}
          {stats.topVariables && stats.topVariables.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Top Performing Variables
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.topVariables.slice(0, 6).map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white capitalize">
                        {v.variable_name}: {v.variable_value}
                      </p>
                      <p className="text-xs text-slate-400">
                        {v.win_count}W / {v.lose_count}L
                      </p>
                    </div>
                    <Badge
                      variant={v.confidence >= 0.7 ? 'success' : v.confidence >= 0.5 ? 'warning' : 'default'}
                      size="xs"
                    >
                      {Math.round(v.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Variables Tab */}
      {activeTab === 'variables' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Variable Performance
            </h3>

            {variables.scores.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No variable data yet</p>
                <p className="text-sm mt-1">Run A/B tests to see which variables perform best</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group by variable name */}
                {Object.entries(
                  variables.scores.reduce((acc, v) => {
                    if (!acc[v.variable_name]) acc[v.variable_name] = [];
                    acc[v.variable_name].push(v);
                    return acc;
                  }, {})
                ).map(([name, values]) => (
                  <div key={name}>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 capitalize">
                      {name.replace('_', ' ')}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {values.sort((a, b) => b.confidence - a.confidence).map((v, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'p-3 rounded-lg border-2',
                            i === 0 && v.confidence >= 0.6
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-900 dark:text-white capitalize">
                              {v.variable_value}
                            </span>
                            {i === 0 && v.confidence >= 0.6 && (
                              <Trophy className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="text-emerald-600">{v.win_count}W</span>
                            {' / '}
                            <span className="text-red-600">{v.lose_count}L</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${v.confidence * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {Math.round(v.confidence * 100)}% confidence
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Available Variables */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Available Test Variables
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variables.available.map(v => (
                <div key={v.name} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <h4 className="font-medium text-slate-900 dark:text-white capitalize mb-1">
                    {v.name.replace('_', ' ')}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    {v.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {v.values.map(val => (
                      <span
                        key={val}
                        className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400"
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Timing Tab */}
      {activeTab === 'timing' && (
        <div className="space-y-6">
          {/* Suggestion Card */}
          {timing.suggestion && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Calendar className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    Optimal Posting Time
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {timing.suggestion.reason}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <p className="text-xs text-slate-400">Best Hour</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {timing.suggestion.suggestedHour}:00
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Best Day</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {timing.suggestion.suggestedDayName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Confidence</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {Math.round(timing.suggestion.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Heatmap */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Response Heatmap
            </h3>

            {timing.heatmap && timing.heatmap.heatmap ? (
              <div className="overflow-x-auto">
                <div className="inline-block">
                  {/* Header */}
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-12" />
                    {days.map(day => (
                      <div key={day} className="w-8 text-center text-xs text-slate-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {timing.heatmap.heatmap.map((row, hour) => (
                    <div key={hour} className="flex items-center gap-1 mb-1">
                      <div className="w-12 text-xs text-slate-400 text-right pr-2">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      {row.map((cell, day) => (
                        <HeatmapCell
                          key={`${hour}-${day}`}
                          value={cell.responses}
                          maxValue={timing.heatmap.maxRate * (cell.posts || 1)}
                          hour={hour}
                          day={days[day]}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No timing data yet</p>
                <p className="text-sm mt-1">Post ads to different times to see what works best</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* A/B Tests Tab */}
      {activeTab === 'tests' && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Active & Recent A/B Tests
          </h3>

          {tests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Beaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No A/B tests yet</p>
              <p className="text-sm mt-1">Tests are created automatically when posting to multiple groups</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(test => (
                <div
                  key={test.job_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {test.job_title || test.job_id}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {test.variant_count} variants, {test.total_responses} responses
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Started {new Date(test.started_at).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })}
                    </p>
                  </div>
                  <button
                    onClick={() => evaluateTest(test.job_id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm hover:bg-primary-600 transition-colors"
                  >
                    <Trophy className="h-4 w-4" />
                    Evaluate
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Training Data Tab */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          {stats?.training && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Total Examples"
                value={stats.training.totalExamples || 0}
                color="primary"
              />
              <StatCard
                icon={Trophy}
                label="Winners"
                value={stats.training.winnerExamples || 0}
                color="emerald"
              />
              <StatCard
                icon={Target}
                label="High Quality"
                value={stats.training.highQualityExamples || 0}
                color="violet"
              />
              <StatCard
                icon={BarChart3}
                label="Avg Quality"
                value={stats.training.averageQuality || '0.00'}
                color="amber"
              />
            </div>
          )}

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Training Data for Ad SLM
              </h3>
              <div className="flex items-center gap-2">
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
                  CSV
                </button>
              </div>
            </div>

            {trainingData.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No training data yet</p>
                <p className="text-sm mt-1">A/B test results will be stored here for SLM training</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainingData.map(data => (
                  <div
                    key={data.id}
                    className={clsx(
                      'p-4 rounded-lg border-l-4',
                      data.is_winner
                        ? 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                        : 'border-l-slate-300 dark:border-l-slate-600 bg-slate-50 dark:bg-slate-800/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {data.is_winner && <Trophy className="h-4 w-4 text-amber-500" />}
                        <Badge
                          variant={data.quality_score >= 0.7 ? 'success' : data.quality_score >= 0.5 ? 'warning' : 'default'}
                          size="xs"
                        >
                          {Math.round(data.quality_score * 100)}% quality
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(data.created_at).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {data.ad_content}
                    </p>
                    {data.variables && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(JSON.parse(data.variables || '{}')).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
