import { XIcon, CheckCircleIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { COLOR_THEMES } from '../../contexts/ThemeContext';
import { FLAIR_OPTIONS } from './reward-constants';

// Flair Picker Modal
export function FlairPickerModal({ isOpen, onClose, currentFlair, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Choose Your Flair</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <XIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">Select an emoji to display next to your name</p>
        <div className="grid grid-cols-6 gap-2">
          {FLAIR_OPTIONS.map((flair, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(flair)}
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all',
                currentFlair === flair
                  ? 'bg-violet-500/30 border-2 border-violet-500'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              )}
            >
              {flair || <span className="text-sm text-white/30">None</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Theme Picker Modal
export function ThemePickerModal({ isOpen, onClose, currentTheme, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Choose Theme</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <XIcon className="h-5 w-5 text-white/50" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">Select a color theme for your app</p>
        <div className="space-y-2">
          {Object.entries(COLOR_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={clsx(
                'w-full p-3 rounded-xl flex items-center gap-3 transition-all',
                currentTheme === key
                  ? 'bg-violet-500/20 border-2 border-violet-500'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              )}
            >
              <div
                className={clsx('w-10 h-10 rounded-lg bg-gradient-to-br', theme.preview)}
                style={{ backgroundColor: theme.bg }}
              >
                <div
                  className="w-full h-full rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}40, ${theme.accent}40)` }}
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">{theme.name}</p>
                <p className="text-xs text-white/50">{theme.description}</p>
              </div>
              {currentTheme === key && (
                <CheckCircleIcon className="h-5 w-5 text-violet-400 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
