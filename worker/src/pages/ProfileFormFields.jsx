import { useState, useEffect } from 'react';
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * FormField - Reusable labeled field with icon, completion indicator, and error display
 */
export function FormField({ label, icon: Icon, children, error, completed }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-white/60">
        <Icon className="h-4 w-4" />
        {label}
        {completed && <CheckCircleIcon className="h-4 w-4 text-emerald-400 ml-auto" />}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <AlertCircleIcon className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * DateInput - Date input that displays DD/MM/YYYY format
 */
export function DateInput({ value, onChange, className }) {
  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const formatForDisplay = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for storage
  const formatForStorage = (displayDate) => {
    if (!displayDate) return '';
    const parts = displayDate.replace(/[^\d]/g, '');
    if (parts.length < 8) return '';
    const day = parts.substring(0, 2);
    const month = parts.substring(2, 4);
    const year = parts.substring(4, 8);
    return `${year}-${month}-${day}`;
  };

  const [displayValue, setDisplayValue] = useState(formatForDisplay(value));

  // Sync with external value changes
  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
  }, [value]);

  const handleChange = (e) => {
    let input = e.target.value.replace(/[^\d/]/g, '');

    // Auto-add slashes
    if (input.length === 2 && !input.includes('/')) {
      input = input + '/';
    } else if (input.length === 5 && input.split('/').length === 2) {
      input = input + '/';
    }

    // Limit to DD/MM/YYYY format
    if (input.replace(/\//g, '').length > 8) {
      input = input.slice(0, 10);
    }

    setDisplayValue(input);

    // If complete date, convert and call onChange
    if (input.length === 10) {
      const isoDate = formatForStorage(input);
      if (isoDate) onChange(isoDate);
    } else if (input.length === 0) {
      onChange('');
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder="DD/MM/YYYY"
      maxLength={10}
      className={className}
    />
  );
}

/**
 * ProfileFormStep - Renders all profile form fields (name, phone, address, dob)
 */
export default function ProfileFormStep({ formData, errors, onChange }) {
  const handleChange = (field, value) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-4">
      <FormField label="Full Name" icon={UserIcon} error={errors.name} completed={!!formData.name}>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter your full name"
          className={clsx(
            'w-full px-4 py-3 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors',
            errors.name ? 'border-red-500' : 'border-white/[0.05]'
          )}
        />
      </FormField>

      <FormField label="Phone Number" icon={PhoneIcon} error={errors.phone} completed={!!formData.phone}>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+65 9XXX XXXX"
          className={clsx(
            'w-full px-4 py-3 rounded-xl bg-[#0a1628] border text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors',
            errors.phone ? 'border-red-500' : 'border-white/[0.05]'
          )}
        />
      </FormField>

      <FormField label="Address" icon={MapPinIcon} completed={!!formData.address}>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Enter your address (optional)"
          className="w-full px-4 py-3 rounded-xl bg-[#0a1628] border border-white/[0.05] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </FormField>

      <FormField label="Date of Birth" icon={CalendarIcon} completed={!!formData.date_of_birth}>
        <DateInput
          value={formData.date_of_birth}
          onChange={(val) => handleChange('date_of_birth', val)}
          className="w-full px-4 py-3 rounded-xl bg-[#0a1628] border border-white/[0.05] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </FormField>
    </div>
  );
}
