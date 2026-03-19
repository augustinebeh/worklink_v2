import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { calculateLevel, getLevelTier } from '../../../shared/utils/gamification-browser';
import { BorderSelectionModal, AvailabilitySelector } from '../components/profile';
import ProfileImageCrop from '../components/ui/ProfileImageCrop';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileStats from '../components/profile/ProfileStats';
import { ContactInfo, ReferralCard, ProfileMenuItems, TelegramModal } from '../components/profile/ProfileSettings';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const pushNotifications = usePushNotifications();
  const { referralBonus } = useAppSettings();
  const [copied, setCopied] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramCode, setTelegramCode] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  // Profile customization states
  const [showProfileActionModal, setShowProfileActionModal] = useState(false);
  const [showBorderModal, setShowBorderModal] = useState(false);
  const [borders, setBorders] = useState([]);
  const [selectedBorderId, setSelectedBorderId] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
      fetchBorders();
    }
  }, [user?.id]);

  const fetchUserData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setAchievements(data.data.achievements || []);
        setSelectedBorderId(data.data.selected_border_id);
        refreshUser();
      }
    } catch (error) {
      logger.error('Failed to fetch user data:', error);
    }
  };

  const fetchBorders = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/gamification/borders/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setBorders(data.data.borders || []);
        setSelectedBorderId(data.data.selectedBorderId);
      }
    } catch (error) {
      logger.error('Failed to fetch borders:', error);
    }
  };

  const handleSelectBorder = async (borderId) => {
    try {
      const res = await fetch(`/api/v1/gamification/borders/${user.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borderId }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedBorderId(borderId);
        toast.success('Border Updated!', borderId ? 'Your new border is now active' : 'Using level-based border');
        fetchBorders();
        refreshUser();
        setShowBorderModal(false);
      } else {
        toast.error('Failed', data.error || 'Could not update border');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    }
  };

  const handleCopyReferral = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      toast.success('Copied!', 'Referral code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareReferral = async () => {
    const referralCode = user.referral_code || 'N/A';
    const inviteMessage = `Hey! I've been using WorkLink to find flexible jobs and earn extra income.\n\nJoin me and we'll BOTH get $${referralBonus} when you complete your first job!\n\nUse my referral code: ${referralCode}\n\nSign up now: ${window.location.origin}/login?ref=${referralCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Join WorkLink - Earn $${referralBonus}!`, text: inviteMessage });
        toast.success('Shared!', 'Invitation sent');
      } else {
        navigator.clipboard.writeText(inviteMessage);
        toast.success('Copied!', 'Invitation message copied');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        navigator.clipboard.writeText(inviteMessage);
        toast.success('Copied!', 'Invitation message copied');
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Max 5MB');
      return;
    }

    setShowProfileActionModal(false);

    // Convert to base64 and show crop modal
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result);
      setShowCropModal(true);
    };
    reader.onerror = () => {
      toast.error('Upload failed', 'Could not read file');
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (croppedImage) => {
    if (!user?.id) return;

    setUploadingPhoto(true);

    try {
      const res = await fetch(`/api/v1/candidates/${user.id}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: croppedImage }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.questUnlocked) {
          toast.success('Photo uploaded! 🎉', 'Profile quest unlocked - claim your XP in Quests!');
        } else {
          toast.success('Updated!', 'Profile picture changed');
        }

        const updatedUser = {
          ...user,
          profile_photo: croppedImage,
          _lastUpdated: Date.now()
        };

        localStorage.setItem('worker_user', JSON.stringify(updatedUser));
        await refreshUser();
      } else {
        toast.error('Upload failed', data.error || 'Please try again');
      }
    } catch (error) {
      toast.error('Failed', 'Please try again');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleConnectTelegram = async () => {
    setShowTelegramModal(true);
    setTelegramLoading(true);
    try {
      const res = await fetch('/api/v1/messaging/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();
      if (data.success && !data.data.alreadyLinked) {
        setTelegramCode(data.data);
      } else {
        setShowTelegramModal(false);
        if (data.data?.alreadyLinked) toast.info('Already connected');
      }
    } catch (error) {
      setShowTelegramModal(false);
      toast.error('Error', 'Failed to connect');
    }
    setTelegramLoading(false);
  };

  const handleTogglePush = async () => {
    if (pushNotifications.isSubscribed) {
      const success = await pushNotifications.unsubscribe();
      if (success) toast.info('Disabled', 'Push notifications turned off');
    } else {
      const success = await pushNotifications.subscribe();
      if (success) toast.success('Enabled!', 'You will receive push notifications');
      else if (pushNotifications.permission === 'denied') toast.error('Blocked', 'Please enable in browser settings');
    }
  };

  const handleLogout = () => {
    logout();
    setTimeout(() => navigate('/login'), 0);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center pb-24">
        <div className="text-center">
          <UserIcon className="h-16 w-16 mx-auto mb-4 text-white/10" />
          <p className="text-white/40 mb-4">Please log in to view your profile</p>
          <button onClick={() => navigate('/login')} className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium">
            Log In
          </button>
        </div>
      </div>
    );
  }

  const userName = user.name || 'User';
  const userXP = user.xp || 0;
  const userLevel = calculateLevel(userXP);
  const userRating = user.rating || 0;
  const referralCode = user.referral_code || 'N/A';
  const jobsCompleted = user.total_jobs_completed || 0;
  const streakDays = user.streak_days || 0;
  const rawTier = getLevelTier(userLevel);
  const tier = rawTier.replace('Elite', '+').replace(/^([a-z])/, (m) => m.toUpperCase());

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
        id="photo-upload-input"
      />

      <ProfileHeader
        user={user}
        userLevel={userLevel}
        userXP={userXP}
        userRating={userRating}
        streakDays={streakDays}
        uploadingPhoto={uploadingPhoto}
        selectedBorderId={selectedBorderId}
        showProfileActionModal={showProfileActionModal}
        onToggleProfileAction={() => setShowProfileActionModal(!showProfileActionModal)}
        onCloseProfileAction={() => setShowProfileActionModal(false)}
        onSelectPhoto={() => {
          setShowProfileActionModal(false);
          document.getElementById('photo-upload-input')?.click();
        }}
        onSelectBorder={() => {
          setShowProfileActionModal(false);
          setShowBorderModal(true);
        }}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <AvailabilitySelector user={user} onUpdate={refreshUser} />

      <ProfileStats
        jobsCompleted={jobsCompleted}
        achievementCount={achievements.length}
        tier={tier}
      />

      <ReferralCard
        referralCode={referralCode}
        referralBonus={referralBonus}
        copied={copied}
        onCopy={handleCopyReferral}
        onShare={handleShareReferral}
      />

      <ContactInfo user={user} onEdit={() => navigate('/complete-profile')} />

      <ProfileMenuItems
        referralBonus={referralBonus}
        user={user}
        pushNotifications={pushNotifications}
        onNavigate={navigate}
        onConnectTelegram={handleConnectTelegram}
        onTogglePush={handleTogglePush}
        onLogout={handleLogout}
      />

      <BorderSelectionModal
        isOpen={showBorderModal}
        onClose={() => setShowBorderModal(false)}
        borders={borders}
        selectedBorderId={selectedBorderId}
        onSelect={handleSelectBorder}
        userLevel={userLevel}
      />

      <TelegramModal
        isOpen={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
        loading={telegramLoading}
        telegramCode={telegramCode}
      />

      <ProfileImageCrop
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedImage(null);
        }}
        onSave={handleCropSave}
        initialImage={selectedImage}
        title="Crop Profile Picture"
      />

      <style>{`
        @keyframes dropdown {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-dropdown {
          animation: dropdown 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
