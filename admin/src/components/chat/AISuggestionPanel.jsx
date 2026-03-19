import { useState } from 'react';
import {
  X,
  Power,
  Bot,
  Sparkles,
  Edit3,
  ThumbsUp,
  Calendar,
  ArrowDown,
} from 'lucide-react';
import { clsx } from 'clsx';

// AI Suggestion bubble component
export function AISuggestionBubble({ suggestion, onAccept, onEdit, onDismiss }) {
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.content);

  const handleEdit = () => {
    if (editMode) {
      onEdit(editedContent);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  return (
    <div className="mx-4 mb-3 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-medium text-violet-700 dark:text-violet-300">AI Suggestion</span>
        {suggestion.source && (
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full',
            suggestion.fromKB
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
          )}>
            {suggestion.fromKB ? 'Knowledge Base' : 'AI'}
          </span>
        )}
        {suggestion.confidence && (
          <span className="text-xs text-slate-500">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {editMode ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          rows={3}
        />
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {suggestion.content}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onAccept(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {editMode ? 'Send Edited' : 'Accept & Send'}
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          {editMode ? 'Cancel' : 'Edit'}
        </button>
        <button
          onClick={() => onDismiss(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

// SLM Suggestion bubble component
export function SLMSuggestionBubble({ suggestion, onAccept, onEdit, onDismiss }) {
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.content);

  const handleEdit = () => {
    if (editMode) {
      onEdit(editedContent);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  return (
    <div className="mx-4 mb-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">SLM Suggestion</span>
        {suggestion.intent && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            {suggestion.intent.replace(/_/g, ' ')}
          </span>
        )}
        {suggestion.confidence && (
          <span className="text-xs text-slate-500">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          Interview Scheduling
        </span>
      </div>

      {editMode ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {suggestion.content}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onAccept(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Calendar className="h-3.5 w-3.5" />
          {editMode ? 'Send Edited' : 'Accept & Send'}
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          {editMode ? 'Cancel' : 'Edit'}
        </button>
        <button
          onClick={() => onDismiss(suggestion)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

// AI Mode selector component
export function AIModeSelector({ mode, onChange, candidateId }) {
  const modes = [
    { value: 'off', label: 'Off', icon: Power, color: 'slate' },
    { value: 'suggest', label: 'Suggest', icon: Sparkles, color: 'violet' },
    { value: 'auto', label: 'Auto', icon: Bot, color: 'emerald' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
      {modes.map(({ value, label, icon: Icon, color }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === value
              ? color === 'slate'
                ? 'bg-slate-600 text-white'
                : color === 'violet'
                  ? 'bg-violet-500 text-white'
                  : 'bg-emerald-500 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// SLM Mode selector component
export function SLMModeSelector({ mode, onChange, candidateId }) {
  const modes = [
    { value: 'off', label: 'Off', icon: Power, color: 'slate' },
    { value: 'auto', label: 'Auto', icon: Bot, color: 'blue' },
    { value: 'interview_only', label: 'Interview Only', icon: Calendar, color: 'amber' },
    { value: 'inherit', label: 'Inherit', icon: ArrowDown, color: 'slate' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">SLM</span>
      </div>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        {modes.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap',
              mode === value
                ? color === 'slate'
                  ? 'bg-slate-600 text-white'
                  : color === 'blue'
                    ? 'bg-blue-500 text-white'
                    : color === 'amber'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-100 dark:hover:bg-blue-800/50'
            )}
            title={
              value === 'off' ? 'No SLM processing'
              : value === 'auto' ? 'Automatic SLM responses for pending candidates'
              : value === 'interview_only' ? 'Only interview scheduling'
              : 'Use global default SLM setting'
            }
          >
            <Icon className="h-3 w-3" />
            {label === 'Interview Only' ? 'Interview' : label}
          </button>
        ))}
      </div>
    </div>
  );
}
