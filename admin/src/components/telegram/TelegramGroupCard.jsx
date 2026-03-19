import {
  Send as TelegramIcon,
  Trash2,
  Edit3,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { clsx } from 'clsx';

export default function TelegramGroupCard({ group, onEdit, onDelete, onToggleActive }) {
  return (
    <Card className="relative">
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
          onClick={() => onToggleActive(group)}
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
          onClick={() => onEdit(group)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(group.id)}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
