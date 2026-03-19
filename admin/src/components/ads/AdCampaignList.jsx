import {
  Beaker,
  TrendingUp,
  BarChart3,
  Target,
  Trophy,
  Download,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { StatCard } from './AdPerformanceCharts';
import { clsx } from 'clsx';

export function ABTestsPanel({ tests, onEvaluateTest }) {
  return (
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
                onClick={() => onEvaluateTest(test.job_id)}
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
  );
}

export function TrainingDataPanel({ stats, trainingData, onExportTrainingData }) {
  return (
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
              onClick={() => onExportTrainingData('jsonl')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm hover:bg-primary-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export JSONL
            </button>
            <button
              onClick={() => onExportTrainingData('csv')}
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
  );
}
