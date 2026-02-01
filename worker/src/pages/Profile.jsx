import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  StarIcon,
  TrophyIcon,
  ZapIcon,
  LogOutIcon,
  ChevronRightIcon,
  AwardIcon,
  ShareIcon,
  CopyIcon,
  CheckIcon,
  BriefcaseIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  SettingsIcon,
  CameraIcon,
  SparklesIcon,
  MessageCircleIcon,
  ExternalLinkIcon,
  XIcon,
  LinkIcon,
  UnlinkIcon,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles, calculateLevel, getLevelTier, LEVEL_TIERS } from '../utils/gamification';
import { DEFAULTS } from '../utils/constants';

function StatItem({ icon: Icon, label, value, color = 'primary' }) {
  const { isDark } = useTheme();

  const colorClasses = {
    primary: 'text-primary-400 bg-primary-500/20',
    accent: 'text-accent-400 bg-accent-500/20',
    gold: 'text-gold-400 bg-gold-500/20',
  };

  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-xl',
      isDark ? 'bg-dark-800/50' : 'bg-slate-100'
    )}>
      <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-500')}>{label}</p>
        <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      </div>
    </div>
  );
}

// Border preview for customization
function BorderPreview({ tier, isLocked, isSelected, onClick, level }) {
  const { isDark } = useTheme();

  const getTierStyles = () => {
    switch (tier) {
      case 'mythic':
        return {
          gradient: 'bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600',
          glow: isSelected ? 'shadow-lg shadow-rose-500/50' : '',
          label: 'Mythic',
          minLevel: 50,
          animation: 'animate-pulse',
        };
      case 'diamondElite':
        return {
          gradient: 'bg-gradient-to-br from-violet-300 via-fuchsia-400 to-pink-500',
          glow: isSelected ? 'shadow-lg shadow-purple-500/50' : '',
          label: 'Diamond+',
          minLevel: 45,
          animation: '',
        };
      case 'diamond':
        return {
          gradient: 'bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600',
          glow: isSelected ? 'shadow-lg shadow-violet-500/40' : '',
          label: 'Diamond',
          minLevel: 40,
          animation: '',
        };
      case 'platinumElite':
        return {
          gradient: 'bg-gradient-to-br from-cyan-200 via-teal-400 to-emerald-500',
          glow: isSelected ? 'shadow-md shadow-teal-500/40' : '',
          label: 'Platinum+',
          minLevel: 35,
          animation: '',
        };
      case 'platinum':
        return {
          gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-600',
          glow: isSelected ? 'shadow-md shadow-cyan-500/30' : '',
          label: 'Platinum',
          minLevel: 30,
          animation: '',
        };
      case 'goldElite':
        return {
          gradient: 'bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-500',
          glow: isSelected ? 'shadow-md shadow-yellow-400/40' : '',
          label: 'Gold+',
          minLevel: 25,
          animation: '',
        };
      case 'gold':
        return {
          gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600',
          glow: isSelected ? 'shadow-md shadow-yellow-500/30' : '',
          label: 'Gold',
          minLevel: 20,
          animation: '',
        };
      case 'silverElite':
        return {
          gradient: 'bg-gradient-to-br from-zinc-200 via-slate-300 to-zinc-400',
          glow: isSelected ? 'shadow-sm shadow-zinc-400/30' : '',
          label: 'Silver+',
          minLevel: 15,
          animation: '',
        };
      case 'silver':
        return {
          gradient: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500',
          glow: isSelected ? 'shadow-sm shadow-slate-400/20' : '',
          label: 'Silver',
          minLevel: 10,
          animation: '',
        };
      case 'bronzeElite':
        return {
          gradient: 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600',
          glow: isSelected ? 'shadow-sm shadow-orange-500/30' : '',
          label: 'Bronze+',
          minLevel: 5,
          animation: '',
        };
      default: // bronze
        return {
          gradient: 'bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900',
          glow: '',
          label: 'Bronze',
          minLevel: 1,
          animation: '',
        };
    }
  };

  const styles = getTierStyles();

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={clsx(
        'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
        isSelected && !isLocked && (isDark ? 'bg-primary-500/20 ring-2 ring-primary-500' : 'bg-primary-100 ring-2 ring-primary-500'),
        !isSelected && !isLocked && (isDark ? 'bg-dark-800/50 hover:bg-dark-700/50' : 'bg-white hover:bg-slate-50 border border-slate-200'),
        isLocked && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Border preview circle */}
      <div className={clsx(
        'w-12 h-12 rounded-full p-[3px]',
        styles.gradient,
        styles.glow
      )}>
        <div className={clsx(
          'w-full h-full rounded-full flex items-center justify-center',
          isDark ? 'bg-dark-900' : 'bg-white'
        )}>
          {isLocked ? (
            <span className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>Lv.{styles.minLevel}</span>
          ) : (
            <span className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-slate-700')}>{level}</span>
          )}
        </div>
      </div>
      <span className={clsx(
        'text-xs font-medium',
        isLocked ? (isDark ? 'text-dark-500' : 'text-slate-400') : (isDark ? 'text-white' : 'text-slate-700')
      )}>
        {styles.label}
      </span>
      {isSelected && !isLocked && (
        <CheckIcon className="h-4 w-4 text-primary-500" />
      )}
    </button>
  );
}

function MenuLink({ icon: Icon, label, sublabel, onClick, danger, rightElement }) {
  const { isDark } = useTheme();

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between p-4 rounded-xl transition-colors',
        danger
          ? 'bg-red-500/10 hover:bg-red-500/20'
          : isDark
            ? 'bg-dark-800/50 hover:bg-dark-800'
            : 'bg-white hover:bg-slate-50 border border-slate-200'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={clsx('h-5 w-5', danger ? 'text-red-400' : isDark ? 'text-dark-400' : 'text-slate-500')} />
        <div className="text-left">
          <span className={danger ? 'text-red-400' : isDark ? 'text-white' : 'text-slate-900'}>{label}</span>
          {sublabel && (
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-500')}>{sublabel}</p>
          )}
        </div>
      </div>
      {rightElement || (
        <ChevronRightIcon className={clsx('h-5 w-5', danger ? 'text-red-400' : isDark ? 'text-dark-500' : 'text-slate-400')} />
      )}
    </button>
  );
}

function ThemeToggleButton({ compact = false }) {
  const { toggleTheme, isDark } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          isDark ? 'bg-dark-700 hover:bg-dark-600' : 'bg-slate-200 hover:bg-slate-300'
        )}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <SunIcon className="h-4 w-4 text-amber-400" />
        ) : (
          <MoonIcon className="h-4 w-4 text-slate-600" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'p-2 rounded-xl transition-colors',
        isDark ? 'bg-dark-800 hover:bg-dark-700' : 'bg-slate-100 hover:bg-slate-200'
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <SunIcon className="h-5 w-5 text-amber-400" />
      ) : (
        <MoonIcon className="h-5 w-5 text-slate-600" />
      )}
    </button>
  );
}

function XPProgressBar({ currentXP }) {
  const { isDark } = useTheme();
  const safeXP = currentXP || 0;
  const safeLevel = calculateLevel(safeXP);
  const maxLevel = xpThresholds.length;
  const currentThreshold = xpThresholds[safeLevel - 1] || 0;
  const nextThreshold = xpThresholds[safeLevel] || xpThresholds[maxLevel - 1];
  const xpInLevel = Math.max(0, safeXP - currentThreshold);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = safeLevel >= maxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);
  const isMaxLevel = safeLevel >= maxLevel;

  // Level tier styling
  const getLevelStyle = (level) => {
    if (level >= 40) return 'bg-violet-900/50 text-violet-300 border border-violet-500/30';
    if (level >= 30) return 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/30';
    if (level >= 20) return 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30';
    if (level >= 10) return 'bg-slate-700/50 text-slate-300 border border-slate-500/30';
    return isDark ? 'bg-dark-700 text-dark-300' : 'bg-slate-200 text-slate-600';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm',
            getLevelStyle(safeLevel)
          )}>
            Lv.{safeLevel}
          </span>
          <span className={clsx('text-sm', isDark ? 'text-dark-300' : 'text-slate-600')}>
            {levelTitles[safeLevel] || 'Newcomer'}
          </span>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-accent-400">{xpInLevel.toLocaleString()}</span>
          <span className={isDark ? 'text-dark-400' : 'text-slate-500'}> / {xpNeeded.toLocaleString()} XP</span>
        </div>
      </div>

      <div className={clsx('h-3 rounded-full overflow-hidden', isDark ? 'bg-dark-800' : 'bg-slate-200')}>
        <div
          className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!isMaxLevel && (
        <p className={clsx('text-xs mt-1.5 text-right', isDark ? 'text-dark-500' : 'text-slate-500')}>
          {(xpNeeded - xpInLevel).toLocaleString()} XP to {levelTitles[safeLevel + 1] || 'Next Level'}
        </p>
      )}
    </div>
  );
}

function LevelBadgeSimple({ level, size = 'md' }) {
  const safeLevel = level || 1;
  const tier = getLevelTier(safeLevel);

  // Tier-based styling with glow effects
  const getTierStyles = () => {
    switch (tier) {
      case 'mythic':
        return {
          gradient: 'bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600',
          glow: 'shadow-lg shadow-rose-500/50',
          ring: 'ring-2 ring-rose-300/50',
          text: 'text-white',
          animation: 'animate-pulse',
        };
      case 'diamond':
        return {
          gradient: 'bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600',
          glow: 'shadow-lg shadow-violet-500/40',
          ring: 'ring-2 ring-violet-300/50',
          text: 'text-white',
          animation: '',
        };
      case 'platinum':
        return {
          gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-600',
          glow: 'shadow-md shadow-cyan-500/30',
          ring: 'ring-2 ring-cyan-200/40',
          text: 'text-white',
          animation: '',
        };
      case 'gold':
        return {
          gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600',
          glow: 'shadow-md shadow-yellow-500/30',
          ring: 'ring-2 ring-yellow-200/40',
          text: 'text-amber-900',
          animation: '',
        };
      case 'silver':
        return {
          gradient: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500',
          glow: 'shadow-sm shadow-slate-400/20',
          ring: 'ring-1 ring-slate-300/30',
          text: 'text-slate-800',
          animation: '',
        };
      default: // bronze
        return {
          gradient: 'bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900',
          glow: '',
          ring: 'ring-1 ring-amber-400/30',
          text: 'text-amber-100',
          animation: '',
        };
    }
  };

  const styles = getTierStyles();
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';

  return (
    <div className={clsx(
      'relative flex items-center justify-center rounded-full font-bold',
      sizeClasses,
      styles.gradient,
      styles.glow,
      styles.ring,
      styles.text,
      styles.animation
    )}>
      {safeLevel}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramCode, setTelegramCode] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
    }
  }, [user?.id]);

  const fetchUserData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setAchievements(data.data.achievements || []);
        refreshUser();
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferral = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please select an image under 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result;

        const res = await fetch(`/api/v1/candidates/${user.id}/photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo: base64 }),
        });

        const data = await res.json();

        if (data.success) {
          toast.success('Photo updated', 'Your profile picture has been changed');
          refreshUser();
        } else {
          toast.error('Upload failed', data.error || 'Please try again');
        }

        setUploadingPhoto(false);
      };

      reader.onerror = () => {
        toast.error('Upload failed', 'Could not read the image file');
        setUploadingPhoto(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Upload failed', 'Please try again');
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleConnectTelegram = async () => {
    setShowTelegramModal(true);
    setTelegramLoading(true);
    setTelegramCode(null);

    try {
      const res = await fetch('/api/v1/messaging/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.data.alreadyLinked) {
          toast.info('Already Connected', 'Your Telegram is already linked');
          setShowTelegramModal(false);
        } else {
          setTelegramCode(data.data);
        }
      } else {
        toast.error('Error', data.error || 'Failed to generate code');
        setShowTelegramModal(false);
      }
    } catch (error) {
      toast.error('Error', 'Failed to connect. Please try again.');
      setShowTelegramModal(false);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleCopyTelegramCode = () => {
    if (telegramCode?.code) {
      navigator.clipboard.writeText(telegramCode.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      toast.success('Copied', 'Code copied to clipboard');
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      const res = await fetch(`/api/v1/messaging/telegram/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Disconnected', 'Telegram has been unlinked');
        refreshUser();
      } else {
        toast.error('Error', data.error || 'Failed to unlink');
      }
    } catch (error) {
      toast.error('Error', 'Failed to unlink. Please try again.');
    }
  };

  // Not logged in state
  if (!user) {
    return (
      <div className={clsx(
        'min-h-screen flex items-center justify-center pb-24',
        isDark ? 'bg-dark-950' : 'bg-slate-50'
      )}>
        <div className="text-center">
          <UserIcon className={clsx('h-12 w-12 mx-auto mb-4', isDark ? 'text-dark-600' : 'text-slate-400')} />
          <p className={isDark ? 'text-dark-400' : 'text-slate-600'}>Please log in to view your profile</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 rounded-xl bg-primary-500 text-white font-medium"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  // Safe data extraction
  const userName = user.name || 'User';
  const userXP = user.xp || 0;
  const userLevel = calculateLevel(userXP);
  const userRating = user.rating || 0;
  const userEmail = user.email || '';
  const userPhone = user.phone || DEFAULTS.userPhone;
  const referralCode = user.referral_code || 'N/A';
  const jobsCompleted = user.total_jobs_completed || 0;
  const streakDays = user.streak_days || 0;

  // Handle certifications
  let certifications = [];
  try {
    if (Array.isArray(user.certifications)) {
      certifications = user.certifications;
    } else if (typeof user.certifications === 'string') {
      certifications = JSON.parse(user.certifications);
    }
  } catch (e) {
    certifications = [];
  }

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Profile Header Section */}
      <div className={clsx(
        'px-4 pt-4 pb-6',
        isDark
          ? 'bg-gradient-to-b from-primary-900/30 to-dark-950'
          : 'bg-gradient-to-b from-primary-100 to-slate-50'
      )}>
        {/* Profile card */}
        <div className="flex items-center gap-4">
          {/* Avatar with photo upload */}
          <div className="relative">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center border-2 border-primary-400 overflow-hidden">
                {uploadingPhoto ? (
                  <div className="animate-spin h-8 w-8 border-3 border-white border-t-transparent rounded-full" />
                ) : user.profile_photo ? (
                  <img src={user.profile_photo} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{userName.charAt(0)}</span>
                )}
              </div>
              {/* Camera icon overlay */}
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center">
                <CameraIcon className="h-3.5 w-3.5 text-white" />
              </div>
            </label>
            <div className="absolute -bottom-2 -right-2">
              <LevelBadgeSimple level={userLevel} />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{userName}</h2>
              <ThemeToggleButton compact />
            </div>
            <p className="text-primary-400 text-sm">{levelTitles[userLevel] || 'Newcomer'}</p>
            <div className="flex items-center gap-2 mt-1">
              <StarIcon className="h-4 w-4 text-gold-400 fill-gold-400" />
              <span className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{userRating.toFixed(1)}</span>
              <span className={clsx('text-sm', isDark ? 'text-dark-500' : 'text-slate-500')}>rating</span>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-6">
          <XPProgressBar currentXP={userXP} />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatItem icon={BriefcaseIcon} label="Jobs Completed" value={jobsCompleted} color="primary" />
          <StatItem icon={ZapIcon} label="Total XP" value={userXP.toLocaleString()} color="accent" />
          <StatItem icon={TrophyIcon} label="Achievements" value={achievements.length} color="gold" />
          <StatItem icon={ClockIcon} label="Streak" value={`${streakDays} days`} color="primary" />
        </div>

        {/* Profile Border Customization */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className={clsx('h-5 w-5', isDark ? 'text-primary-400' : 'text-primary-500')} />
            <h3 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Profile Border</h3>
          </div>
          <p className={clsx('text-sm mb-3', isDark ? 'text-dark-400' : 'text-slate-500')}>
            Unlock premium borders by leveling up. Your current tier: <span className="font-semibold text-primary-400">{getLevelTier(userLevel).replace('Elite', '+')}</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {['bronze', 'bronzeElite', 'silver', 'silverElite', 'gold', 'goldElite', 'platinum', 'platinumElite', 'diamond', 'diamondElite', 'mythic'].map((tier) => {
              const tierData = LEVEL_TIERS[tier];
              const isLocked = userLevel < tierData.min;
              const currentTier = getLevelTier(userLevel);
              const isSelected = currentTier === tier;
              const displayName = tier.replace('Elite', '+');

              return (
                <BorderPreview
                  key={tier}
                  tier={tier}
                  isLocked={isLocked}
                  isSelected={isSelected}
                  level={userLevel}
                  onClick={() => {
                    if (!isLocked) {
                      toast.info('Border Applied', `Using ${displayName.charAt(0).toUpperCase() + displayName.slice(1)} border`);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Referral Code */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-900/30 to-accent-800/10 border border-accent-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShareIcon className="h-5 w-5 text-accent-400" />
              <span className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>Referral Code</span>
            </div>
            <span className="text-xs text-accent-400">Earn $30 per referral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={clsx(
              'flex-1 px-4 py-3 rounded-xl border',
              isDark ? 'bg-dark-800 border-white/10' : 'bg-white border-slate-200'
            )}>
              <p className={clsx('font-mono text-lg', isDark ? 'text-white' : 'text-slate-900')}>{referralCode}</p>
            </div>
            <button
              onClick={handleCopyReferral}
              className="p-3 rounded-xl bg-accent-500 text-white"
            >
              {copied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Certifications */}
        {certifications.length > 0 && (
          <div>
            <h3 className={clsx('text-lg font-semibold mb-3', isDark ? 'text-white' : 'text-slate-900')}>Certifications</h3>
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-500/20 text-primary-400 text-sm"
                >
                  <AwardIcon className="h-4 w-4" />
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div>
          <h3 className={clsx('text-lg font-semibold mb-3', isDark ? 'text-white' : 'text-slate-900')}>Contact Info</h3>
          <div className="space-y-3">
            <div className={clsx(
              'flex items-center gap-3 p-4 rounded-xl',
              isDark ? 'bg-dark-800/50' : 'bg-white border border-slate-200'
            )}>
              <MailIcon className={clsx('h-5 w-5', isDark ? 'text-dark-400' : 'text-slate-500')} />
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{userEmail}</span>
            </div>
            <div className={clsx(
              'flex items-center gap-3 p-4 rounded-xl',
              isDark ? 'bg-dark-800/50' : 'bg-white border border-slate-200'
            )}>
              <PhoneIcon className={clsx('h-5 w-5', isDark ? 'text-dark-400' : 'text-slate-500')} />
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{userPhone}</span>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="space-y-2">
          <MenuLink icon={UserIcon} label="Edit Profile" sublabel="Update your information" onClick={() => navigate('/complete-profile')} />
          <MenuLink icon={ShareIcon} label="Refer & Earn" sublabel="Invite friends, get $30" onClick={() => navigate('/referrals')} />
          <MenuLink icon={AwardIcon} label="Achievements" onClick={() => navigate('/achievements')} />
          <MenuLink icon={TrophyIcon} label="Leaderboard" onClick={() => navigate('/leaderboard')} />
          <MenuLink
            icon={MessageCircleIcon}
            label="Connect Telegram"
            sublabel={user.telegram_chat_id ? 'Connected' : 'Get notifications via Telegram'}
            onClick={user.telegram_chat_id ? handleUnlinkTelegram : handleConnectTelegram}
            rightElement={
              user.telegram_chat_id ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckIcon className="h-4 w-4" /> Connected
                </span>
              ) : null
            }
          />
          <MenuLink icon={LogOutIcon} label="Log Out" onClick={handleLogout} danger />
        </div>
      </div>

      {/* Telegram Connection Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={clsx(
            'w-full max-w-sm rounded-2xl p-6',
            isDark ? 'bg-dark-900 border border-dark-700' : 'bg-white'
          )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <MessageCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                  Connect Telegram
                </h3>
              </div>
              <button
                onClick={() => setShowTelegramModal(false)}
                className={clsx('p-2 rounded-lg', isDark ? 'hover:bg-dark-700' : 'hover:bg-slate-100')}
              >
                <XIcon className={clsx('h-5 w-5', isDark ? 'text-dark-400' : 'text-slate-500')} />
              </button>
            </div>

            {telegramLoading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full mb-3" />
                <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>Generating code...</p>
              </div>
            ) : telegramCode ? (
              <div className="space-y-4">
                {/* Instructions */}
                <div className={clsx('p-3 rounded-xl text-sm', isDark ? 'bg-dark-800' : 'bg-slate-100')}>
                  <ol className={clsx('list-decimal list-inside space-y-2', isDark ? 'text-dark-300' : 'text-slate-600')}>
                    <li>Open Telegram</li>
                    <li>Search for <span className="font-semibold text-blue-400">@WorkLinkAdminBot</span></li>
                    <li>Send the code below</li>
                  </ol>
                </div>

                {/* Code Display */}
                <div className={clsx(
                  'flex items-center justify-between p-4 rounded-xl border-2 border-dashed',
                  isDark ? 'bg-dark-800 border-dark-600' : 'bg-slate-50 border-slate-300'
                )}>
                  <span className={clsx('text-2xl font-mono font-bold tracking-widest', isDark ? 'text-white' : 'text-slate-900')}>
                    {telegramCode.code}
                  </span>
                  <button
                    onClick={handleCopyTelegramCode}
                    className="p-2 rounded-lg bg-primary-500 text-white"
                  >
                    {codeCopied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
                  </button>
                </div>

                {/* Expiry notice */}
                <p className={clsx('text-xs text-center', isDark ? 'text-dark-500' : 'text-slate-500')}>
                  Code expires in {telegramCode.expiresIn}
                </p>

                {/* Open Telegram Button */}
                <a
                  href={telegramCode.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 text-white font-medium"
                >
                  <ExternalLinkIcon className="h-5 w-5" />
                  Open in Telegram
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
