import {
  VolumeXIcon,
  MoonIcon,
  CalendarIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';
import DateTimePicker, { TimePicker } from '../ui/DateTimePicker';

// Timezone options
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
];

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' }
];

// Days of week for weekly digest
const DAYS_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' }
];

export default function AlertRuleForm({ preferences, onPreferenceChange, onArrayChange }) {
  return (
    <>
      {/* Quiet Hours Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeXIcon className="h-5 w-5" />
            Quiet Hours Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Enable Quiet Hours"
            description="Suppress non-critical notifications during these hours"
            checked={preferences.quiet_hours_enabled}
            onChange={(e) => onPreferenceChange('quiet_hours_enabled', e.target.checked)}
          />

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <TimePicker
                label="Start Time"
                value={preferences.quiet_hours_start}
                onChange={(e) => onPreferenceChange('quiet_hours_start', e.target.value)}
              />
              <TimePicker
                label="End Time"
                value={preferences.quiet_hours_end}
                onChange={(e) => onPreferenceChange('quiet_hours_end', e.target.value)}
              />
              <Select
                label="Timezone"
                options={TIMEZONE_OPTIONS}
                value={preferences.timezone}
                onChange={(value) => onPreferenceChange('timezone', value)}
              />
            </div>
          )}

          {/* Do Not Disturb */}
          <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Toggle
              label="Do Not Disturb Mode"
              description="Temporarily disable all non-critical notifications"
              checked={preferences.dnd_enabled}
              onChange={(e) => onPreferenceChange('dnd_enabled', e.target.checked)}
            />
            {preferences.dnd_enabled && (
              <DateTimePicker
                label="DND Until"
                type="datetime-local"
                value={preferences.dnd_until}
                onChange={(e) => onPreferenceChange('dnd_until', e.target.value)}
                icon={MoonIcon}
                hint="Notifications will resume after this time"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Digest Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Toggle
            label="Enable Daily Digest"
            description="Receive a summary of alerts and activities"
            checked={preferences.digest_enabled}
            onChange={(e) => onPreferenceChange('digest_enabled', e.target.checked)}
          />

          {preferences.digest_enabled && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Frequency"
                  options={FREQUENCY_OPTIONS}
                  value={preferences.digest_frequency}
                  onChange={(value) => onPreferenceChange('digest_frequency', value)}
                />
                <TimePicker
                  label="Time"
                  value={preferences.digest_time}
                  onChange={(e) => onPreferenceChange('digest_time', e.target.value)}
                />
              </div>

              {preferences.digest_frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Days of Week
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Toggle
                        key={day.value}
                        label={day.label}
                        size="sm"
                        checked={(preferences.digest_days || []).includes(day.value)}
                        onChange={(e) => onArrayChange('digest_days', day.value, e.target.checked)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
