import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SaveIcon } from 'lucide-react';

// UI Components
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

// Extracted sub-components
import AlertRuleList from '../components/alerts/AlertRuleList';
import AlertRuleForm from '../components/alerts/AlertRuleForm';

// Services
import alertService from '../shared/services/api/alert.service';
import { useAuth } from '../contexts/AuthContext';

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

      {/* Channel Preferences + Advanced Settings */}
      <AlertRuleList
        preferences={preferences}
        onPreferenceChange={handlePreferenceChange}
      />

      {/* Quiet Hours + Digest Settings */}
      <AlertRuleForm
        preferences={preferences}
        onPreferenceChange={handlePreferenceChange}
        onArrayChange={handleArrayChange}
      />

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
