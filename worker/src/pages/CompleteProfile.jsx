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
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';

function FormField({ label, icon: Icon, children, error, completed }) {
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

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
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

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please select an image under 5MB');
      return;
    }

    setUploadingPhoto(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const res = await fetch(`/api/v1/candidates/${user.id}/photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo: event.target?.result }),
        });
        const data = await res.json();

        if (data.success) {
          toast.success('Photo uploaded', 'Your profile picture has been updated');
          await refreshUser?.();
        } else {
          toast.error('Upload failed', data.error || 'Please try again');
        }
      } catch (error) {
        toast.error('Upload failed', 'Please try again');
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.onerror = () => {
      toast.error('Upload failed', 'Could not read the image file');
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
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
      const res = await fetch(`/api/v1/candidates/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        if (data.questUnlocked) {
          toast.success('Profile Complete! 🎉', 'You unlocked +100 XP reward - claim it in Quests!');
        } else {
          toast.success('Profile saved', 'Your profile has been updated');
        }
        await refreshUser?.();
        navigate('/profile');
      } else {
        toast.error('Save failed', data.error || 'Unknown error occurred');
      }
    } catch (error) {
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
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <p className="text-white/40">Please log in to edit your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#020817]/95 backdrop-blur-xl px-4 pt-4 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Complete Profile</h1>
            <p className="text-sm text-white/40">{completionPercent}% complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              completionPercent === 100 
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                : 'bg-gradient-to-r from-violet-500 to-cyan-500'
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
            <div className="w-28 h-28 rounded-2xl bg-[#0a1628] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden hover:border-emerald-500/50 transition-colors">
              {uploadingPhoto ? (
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
              ) : user.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <CameraIcon className="h-8 w-8 mx-auto mb-1 text-white/30" />
                  <span className="text-xs text-white/40">Add Photo</span>
                </div>
              )}
            </div>
            {user.profile_photo && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircleIcon className="h-4 w-4 text-white" />
              </div>
            )}
          </label>
        </div>

        {/* Form Fields */}
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
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0a1628] border border-white/[0.05] text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </FormField>
        </div>

        {/* Completion Tips */}
        {completionPercent < 100 && (
          <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <p className="text-sm font-medium mb-2 text-white">Complete your profile to:</p>
            <ul className="text-sm space-y-1 text-white/60">
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
            'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
            saving
              ? 'bg-emerald-500/50 text-white/50'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
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
