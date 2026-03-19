import { Download } from 'lucide-react';
import Card from '../ui/Card';

export default function MLModelPanel({ training, onExport }) {
  if (!training) return null;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Training Data
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Examples</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{training.totalExamples}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Approved</p>
          <p className="text-xl font-bold text-emerald-600">{training.approvedExamples}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">High Quality</p>
          <p className="text-xl font-bold text-violet-600">{training.highQualityExamples}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Avg Quality</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{training.averageQuality}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onExport('jsonl')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm hover:bg-primary-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export JSONL
        </button>
        <button
          onClick={() => onExport('csv')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
    </Card>
  );
}
