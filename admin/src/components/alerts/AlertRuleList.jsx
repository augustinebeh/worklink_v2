import {
  BellIcon,
  MailIcon,
  SmartphoneIcon,
  MessageSquareIcon,
  SettingsIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import Slider from '../ui/Slider';

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

export default function AlertRuleList({ preferences, onPreferenceChange }) {
  return (
    <>
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
              onChange={(e) => onPreferenceChange('email_enabled', e.target.checked)}
            />
            {preferences.email_enabled && (
              <Input
                type="email"
                label="Email Address"
                placeholder="your.email@company.com"
                value={preferences.email_address || ''}
                onChange={(e) => onPreferenceChange('email_address', e.target.value)}
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
              onChange={(e) => onPreferenceChange('sms_enabled', e.target.checked)}
            />
            {preferences.sms_enabled && (
              <Input
                type="tel"
                label="Phone Number"
                placeholder="+65 9123 4567"
                value={preferences.sms_number || ''}
                onChange={(e) => onPreferenceChange('sms_number', e.target.value)}
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
              onChange={(e) => onPreferenceChange('slack_enabled', e.target.checked)}
            />
            {preferences.slack_enabled && (
              <Input
                label="Slack User ID"
                placeholder="U1234567890"
                value={preferences.slack_user_id || ''}
                onChange={(e) => onPreferenceChange('slack_user_id', e.target.value)}
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
            onChange={(value) => onPreferenceChange('min_priority', value)}
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
              onChange={(value) => onPreferenceChange('max_alerts_per_hour', value)}
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
                onChange={(value) => onPreferenceChange('max_sms_per_day', value)}
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
    </>
  );
}
