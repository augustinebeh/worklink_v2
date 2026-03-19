import {
  Beaker,
  TrendingUp,
  Target,
  Trophy,
  Clock,
  Calendar,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { clsx } from 'clsx';

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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export { StatCard };

export function OverviewPanel({ stats }) {
  if (!stats) return null;

  return (
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
  );
}

export function TimingPanel({ timing }) {
  return (
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
                {DAYS.map(day => (
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
                      day={DAYS[day]}
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
  );
}
