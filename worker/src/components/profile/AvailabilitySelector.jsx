import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, CheckIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../ui/Toast';
import { SectionHeader } from '../common';

export default function AvailabilitySelector({ user, onUpdate }) {
  const [selected, setSelected] = useState(user?.availability_mode || 'weekdays');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const options = [
    { id: 'weekdays', label: 'Weekdays', desc: 'Mon-Fri' },
    { id: 'weekends', label: 'Weekends', desc: 'Sat-Sun' },
    { id: 'all', label: 'All Week', desc: 'Every day' },
    { id: 'custom', label: 'Custom', desc: 'Pick days' },
  ];

  const handleSelect = async (mode) => {
    if (mode === 'custom') { navigate('/calendar'); return; }
    if (mode === selected) return;
    setSaving(true);
    setSelected(mode);
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}/availability-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Availability Updated', `Set to ${options.find(o => o.id === mode)?.label}`);
        onUpdate?.();
      }
    } catch (error) {
      toast.error('Failed', 'Could not update availability');
      setSelected(user?.availability_mode || 'weekdays');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 mt-6">
      <SectionHeader
        title="My Availability"
        icon={CalendarIcon}
        actionLabel="View Calendar →"
        onAction={() => navigate('/calendar')}
        actionVariant="link"
      />
      <div className="grid grid-cols-4 gap-2">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={saving}
            className={clsx(
              'p-3 rounded-2xl border transition-all text-center',
              selected === opt.id
                ? 'bg-emerald-500/20 border-emerald-500/40 ring-2 ring-emerald-500/30'
                : 'bg-theme-card/80 border-white/[0.05] hover:border-white/10'
            )}
          >
            <div className={clsx('text-sm font-semibold', selected === opt.id ? 'text-emerald-400' : 'text-white')}>
              {opt.label}
            </div>
            <div className="text-xs text-white/40 mt-0.5">{opt.desc}</div>
            {selected === opt.id && <CheckIcon className="h-4 w-4 text-emerald-400 mx-auto mt-1" />}
          </button>
        ))}
      </div>
    </div>
  );
}
