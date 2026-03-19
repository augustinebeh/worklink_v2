import { Target, Trophy } from 'lucide-react';
import Card from '../ui/Card';
import { clsx } from 'clsx';

export default function AdOptimizationPanel({ variables }) {
  return (
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
  );
}
