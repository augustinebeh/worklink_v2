import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  MailIcon,
  SmartphoneIcon,
  MessageSquareIcon,
  VolumeXIcon,
  ClockIcon,
  SettingsIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MoonIcon,
  CalendarIcon
} from 'lucide-react';

// UI Components
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Toggle from '../components/ui/Toggle';
import Slider from '../components/ui/Slider';
import DateTimePicker, { TimePicker } from '../components/ui/DateTimePicker';
import { useToast } from '../components/ui/Toast';

// Services
import { alertService } from '../shared/services/api/alert.service';
import { useAuth } from '../contexts/AuthContext';

// Timezone options
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
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

export default function AlertSettings() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState({
    // Channel preferences
    email_enabled: true,
    email_address: '',
    sms_enabled: false,
    sms_number: '',
    slack_enabled: true,
    slack_user_id: '',
    in_app_enabled: true,
    push_enabled: false,

    // Quiet hours
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: 'Asia/Singapore',

    // DND mode
    dnd_enabled: false,
    dnd_until: '',

    // Digest settings
    digest_enabled: true,
    digest_frequency: 'daily',
    digest_time: '09:00',
    digest_days: ['1', '2', '3', '4', '5'], // Weekdays for weekly digest

    // Advanced settings
    min_priority: 'low',
    max_alerts_per_hour: 10,
    max_sms_per_day: 5
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Fetch preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['alert-preferences', user?.id],
    queryFn: () => alertService.getPreferences(user?.id),
    enabled: !!user?.id
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (data) => alertService.updatePreferences({ ...data, user_id: user?.id }),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Settings saved',
        message: 'Your notification preferences have been updated successfully.'
      });
      setHasChanges(false);
      queryClient.invalidateQueries(['alert-preferences', user?.id]);
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to save settings',
        message: error.message || 'An error occurred while saving your preferences.'
      });
    }
  });

  // Initialize preferences from API data
  useEffect(() => {
    if (preferencesData?.data) {
      const apiData = preferencesData.data;
      setPreferences(prevPrefs => ({
        ...prevPrefs,
        ...apiData,
        digest_days: apiData.digest_days || ['1', '2', '3', '4', '5']
      }));
    }
  }, [preferencesData]);

  // Handle preference changes
  const handlePreferenceChange = useCallback((key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  }, []);

  // Handle array changes (like digest days)
  const handleArrayChange = useCallback((key, value, checked) => {
    setPreferences(prev => ({
      ...prev,
      [key]: checked
        ? [...(prev[key] || []), value]
        : (prev[key] || []).filter(item => item !== value)
    }));
    setHasChanges(true);
  }, []);

  // Save preferences
  const handleSave = useCallback(() => {
    updatePreferencesMutation.mutate(preferences);
  }, [preferences, updatePreferencesMutation]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (preferencesData?.data) {
      setPreferences(prevPrefs => ({
        ...prevPrefs,
        ...preferencesData.data
      }));
      setHasChanges(false);
    }
  }, [preferencesData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alert Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your notification preferences and delivery settings
          </p>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={updatePreferencesMutation.isPending}
            >
              Reset
            </Button>
            <Button
              icon={SaveIcon}
              onClick={handleSave}
              loading={updatePreferencesMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Channel Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email */}
          <div className="space-y-3">
            <Toggle
              label="Email Notifications"
              description="Receive alerts via email"
              checked={preferences.email_enabled}
              onChange={(e) => handlePreferenceChange('email_enabled', e.target.checked)}
            />
            {preferences.email_enabled && (
              <Input
                type="email"
                label="Email Address"
                placeholder="your.email@company.com"
                value={preferences.email_address || ''}
                onChange={(e) => handlePreferenceChange('email_address', e.target.value)}
                icon={MailIcon}
              />
            )}
          </div>

          {/* SMS */}
          <div className="space-y-3">
            <Toggle
              label="SMS Notifications"
              description="Receive critical alerts via SMS"
              checked={preferences.sms_enabled}
              onChange={(e) => handlePreferenceChange('sms_enabled', e.target.checked)}
            />
            {preferences.sms_enabled && (
              <Input
                type="tel"
                label="Phone Number"
                placeholder="+65 9123 4567"
                value={preferences.sms_number || ''}
                onChange={(e) => handlePreferenceChange('sms_number', e.target.value)}
                icon={SmartphoneIcon}
              />
            )}
          </div>

          {/* Slack */}
          <div className="space-y-3">
            <Toggle
              label="Slack Notifications"
              description="Receive alerts in Slack"
              checked={preferences.slack_enabled}
              onChange={(e) => handlePreferenceChange('slack_enabled', e.target.checked)}
            />
            {preferences.slack_enabled && (
              <Input
                label="Slack User ID"
                placeholder="U1234567890"
                value={preferences.slack_user_id || ''}
                onChange={(e) => handlePreferenceChange('slack_user_id', e.target.value)}
                icon={MessageSquareIcon}
                hint="Your Slack member ID (found in your profile)"
              />
            )}
          </div>

          {/* In-app (always enabled) */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                In-App Notifications
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Always enabled for important system alerts
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Enabled</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
            onChange={(e) => handlePreferenceChange('quiet_hours_enabled', e.target.checked)}
          />

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <TimePicker
                label="Start Time"
                value={preferences.quiet_hours_start}
                onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
              />
              <TimePicker
                label="End Time"
                value={preferences.quiet_hours_end}
                onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
              />
              <Select
                label="Timezone"
                options={TIMEZONE_OPTIONS}
                value={preferences.timezone}
                onChange={(value) => handlePreferenceChange('timezone', value)}
              />
            </div>
          )}

          {/* Do Not Disturb */}
          <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Toggle
              label="Do Not Disturb Mode"
              description="Temporarily disable all non-critical notifications"
              checked={preferences.dnd_enabled}
              onChange={(e) => handlePreferenceChange('dnd_enabled', e.target.checked)}
            />
            {preferences.dnd_enabled && (
              <DateTimePicker
                label="DND Until"
                type="datetime-local"
                value={preferences.dnd_until}
                onChange={(e) => handlePreferenceChange('dnd_until', e.target.value)}
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
            onChange={(e) => handlePreferenceChange('digest_enabled', e.target.checked)}
          />

          {preferences.digest_enabled && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Frequency"
                  options={FREQUENCY_OPTIONS}
                  value={preferences.digest_frequency}
                  onChange={(value) => handlePreferenceChange('digest_frequency', value)}
                />
                <TimePicker
                  label="Time"
                  value={preferences.digest_time}
                  onChange={(e) => handlePreferenceChange('digest_time', e.target.value)}
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
                        onChange={(e) => handleArrayChange('digest_days', day.value, e.target.checked)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Priority threshold */}
          <Select
            label="Minimum Priority"
            description="Only receive notifications for alerts at or above this priority level"
            options={PRIORITY_OPTIONS}
            value={preferences.min_priority}
            onChange={(value) => handlePreferenceChange('min_priority', value)}
          />

          {/* Rate limiting */}
          <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Slider
              label="Maximum Alerts per Hour"
              description="Prevent notification overload by limiting hourly alerts"
              min={1}
              max={50}
              step={1}
              value={preferences.max_alerts_per_hour || 10}
              onChange={(value) => handlePreferenceChange('max_alerts_per_hour', value)}
              valueFormatter={(val) => `${val} alert${val !== 1 ? 's' : ''}`}
            />

            {preferences.sms_enabled && (
              <Slider
                label="Maximum SMS per Day"
                description="Limit daily SMS notifications to control costs"
                min={1}
                max={20}
                step={1}
                value={preferences.max_sms_per_day || 5}
                onChange={(value) => handlePreferenceChange('max_sms_per_day', value)}
                valueFormatter={(val) => `${val} SMS`}
              />
            )}
          </div>

          {/* Information panel */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Rate Limiting Information
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Critical alerts will always be delivered regardless of rate limits.
                  These settings only apply to medium and low priority notifications.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button at bottom for mobile */}
      {hasChanges && (
        <div className="md:hidden">
          <Button
            icon={SaveIcon}
            onClick={handleSave}
            loading={updatePreferencesMutation.isPending}
            className="w-full"
            size="lg"
          >
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}