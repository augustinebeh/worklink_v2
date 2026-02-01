import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SaveIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';

function FormField({ label, icon: Icon, children, error, completed }) {
  const { isDark } = useTheme();

  return (
    <div className="space-y-2">
      <label className={clsx(
        'flex items-center gap-2 text-sm font-medium',
        isDark ? 'text-dark-300' : 'text-slate-600'
      )}>
        <Icon className="h-4 w-4" />
        {label}
        {completed && <CheckCircleIcon className="h-4 w-4 text-accent-400 ml-auto" />}
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

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    date_of_birth: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        date_of_birth: user.date_of_birth || '',
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please select an image under 5MB');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`/api/v1/candidates/${user.id}/photo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Photo uploaded', 'Your profile picture has been updated');
        refreshUser?.();
      } else {
        toast.error('Upload failed', data.error);
      }
    } catch (error) {
      toast.error('Upload failed', 'Please try again');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Validation failed', 'Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      toast.error('Not logged in', 'Please log in to save your profile');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving profile:', formData);
      const res = await fetch(`/api/v1/candidates/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log('Save response:', data);

      if (data.success) {
        toast.success('Profile saved', 'Your profile has been updated');
        await refreshUser?.();
        navigate('/profile');
      } else {
        toast.error('Save failed', data.error || 'Unknown error occurred');
        console.error('Profile save failed:', data);
      }
    } catch (error) {
      console.error('Profile save error:', error);
      toast.error('Save failed', error.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  // Calculate completion percentage
  const completionFields = [
    { field: 'name', filled: !!formData.name },
    { field: 'phone', filled: !!formData.phone },
    { field: 'photo', filled: !!user?.profile_photo },
    { field: 'address', filled: !!formData.address },
  ];
  const completedCount = completionFields.filter(f => f.filled).length;
  const completionPercent = Math.round((completedCount / completionFields.length) * 100);

  if (!user) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
        <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>Please log in to edit your profile</p>
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-lg px-4 pt-safe pb-4 border-b',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={clsx(
              'p-2 rounded-xl transition-colors',
              isDark ? 'hover:bg-dark-800' : 'hover:bg-slate-100'
            )}
          >
            <ChevronLeftIcon className={clsx('h-6 w-6', isDark ? 'text-white' : 'text-slate-900')} />
          </button>
          <div className="flex-1">
            <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              Complete Profile
            </h1>
            <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>
              {completionPercent}% complete
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={clsx('mt-3 h-2 rounded-full overflow-hidden', isDark ? 'bg-dark-800' : 'bg-slate-200')}>
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              completionPercent === 100 ? 'bg-accent-500' : 'bg-primary-500'
            )}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Photo */}
        <div className="flex justify-center">
          <label className="cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
            <div className={clsx(
              'w-28 h-28 rounded-2xl flex items-center justify-center border-2 border-dashed overflow-hidden transition-colors',
              isDark
                ? 'bg-dark-800 border-dark-600 hover:border-primary-500'
                : 'bg-slate-100 border-slate-300 hover:border-primary-500'
            )}>
              {uploadingPhoto ? (
                <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
              ) : user.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <CameraIcon className={clsx('h-8 w-8 mx-auto mb-1', isDark ? 'text-dark-400' : 'text-slate-400')} />
                  <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>Add Photo</span>
                </div>
              )}
            </div>
            {user.profile_photo && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center">
                <CheckCircleIcon className="h-4 w-4 text-white" />
              </div>
            )}
          </label>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <FormField
            label="Full Name"
            icon={UserIcon}
            error={errors.name}
            completed={!!formData.name}
          >
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter your full name"
              className={clsx(
                'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-dark-800 border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500/20',
                errors.name && 'border-red-500'
              )}
            />
          </FormField>

          <FormField
            label="Phone Number"
            icon={PhoneIcon}
            error={errors.phone}
            completed={!!formData.phone}
          >
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+65 9XXX XXXX"
              className={clsx(
                'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-dark-800 border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500/20',
                errors.phone && 'border-red-500'
              )}
            />
          </FormField>

          <FormField
            label="Address"
            icon={MapPinIcon}
            completed={!!formData.address}
          >
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter your address (optional)"
              className={clsx(
                'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-dark-800 border-dark-700 text-white placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500/20'
              )}
            />
          </FormField>

          <FormField
            label="Date of Birth"
            icon={CalendarIcon}
            completed={!!formData.date_of_birth}
          >
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className={clsx(
                'w-full px-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-dark-800 border-dark-700 text-white focus:border-primary-500 focus:ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-primary-500/20'
              )}
            />
          </FormField>
        </div>

        {/* Completion Tips */}
        {completionPercent < 100 && (
          <div className={clsx(
            'p-4 rounded-xl border',
            isDark ? 'bg-primary-900/20 border-primary-500/30' : 'bg-primary-50 border-primary-200'
          )}>
            <p className={clsx('text-sm font-medium mb-2', isDark ? 'text-white' : 'text-slate-900')}>
              Complete your profile to:
            </p>
            <ul className={clsx('text-sm space-y-1', isDark ? 'text-dark-300' : 'text-slate-600')}>
              <li>• Get matched with more jobs</li>
              <li>• Earn +100 XP bonus</li>
              <li>• Unlock special quests</li>
            </ul>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={clsx(
            'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
            saving
              ? 'bg-primary-500/50 text-white/50'
              : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]'
          )}
        >
          {saving ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="h-5 w-5" />
              Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
