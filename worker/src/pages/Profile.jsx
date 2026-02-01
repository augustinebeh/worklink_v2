import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  CameraIcon,
  SparklesIcon,
  MessageCircleIcon,
  ExternalLinkIcon,
  XIcon,
  SettingsIcon,
  FlameIcon,
  BellIcon,
  CalendarIcon,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles, calculateLevel, getLevelTier, LEVEL_TIERS } from '../utils/gamification';
import { DEFAULTS } from '../utils/constants';
import ProfileAvatar from '../components/ui/ProfileAvatar';

// Availability Quick Selector
function AvailabilitySelector({ user, onUpdate }) {
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
    if (mode === 'custom') {
      navigate('/calendar');
      return;
    }
    
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-emerald-400" />
          My Availability
        </h2>
        <Link to="/calendar" className="text-emerald-400 text-sm font-medium">
          View Calendar →
        </Link>
      </div>
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
                : 'bg-[#0a1628]/80 border-white/[0.05] hover:border-white/10'
            )}
          >
            <div className={clsx(
              'text-sm font-semibold',
              selected === opt.id ? 'text-emerald-400' : 'text-white'
            )}>
              {opt.label}
            </div>
            <div className="text-xs text-white/40 mt-0.5">{opt.desc}</div>
            {selected === opt.id && (
              <CheckIcon className="h-4 w-4 text-emerald-400 mx-auto mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  };

  return (
    <div className={clsx(
      'p-4 rounded-2xl border bg-gradient-to-br',
      colorClasses[color].split(' ').slice(0, 3).join(' ')
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('h-4 w-4', colorClasses[color].split(' ').slice(-1))} />
        <span className="text-white/50 text-xs">{label}</span>
      </div>
      <p className={clsx('text-2xl font-bold', colorClasses[color].split(' ').slice(-1))}>{value}</p>
    </div>
  );
}

// Menu Link Component
function MenuLink({ icon: Icon, label, sublabel, onClick, danger, badge }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-4 p-4 rounded-2xl transition-all',
        danger
          ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'
          : 'bg-[#0a1628]/80 border border-white/[0.05] hover:border-white/10'
      )}
    >
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        danger ? 'bg-red-500/20' : 'bg-white/5'
      )}>
        <Icon className={clsx('h-5 w-5', danger ? 'text-red-400' : 'text-white/70')} />
      </div>
      <div className="flex-1 text-left">
        <span className={danger ? 'text-red-400' : 'text-white'}>{label}</span>
        {sublabel && <p className="text-xs text-white/40">{sublabel}</p>}
      </div>
      {badge ? (
        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">{badge}</span>
      ) : (
        <ChevronRightIcon className={clsx('h-5 w-5', danger ? 'text-red-400/50' : 'text-white/30')} />
      )}
    </button>
  );
}

// XP Progress Component
function XPProgress({ currentXP, level }) {
  const maxLevel = xpThresholds.length;
  const currentThreshold = xpThresholds[level - 1] || 0;
  const nextThreshold = xpThresholds[level] || xpThresholds[maxLevel - 1];
  const xpInLevel = Math.max(0, currentXP - currentThreshold);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = level >= maxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-white/50">Level Progress</span>
        <span className="text-white">
          <span className="text-emerald-400 font-bold">{xpInLevel.toLocaleString()}</span>
          <span className="text-white/30"> / {xpNeeded.toLocaleString()} XP</span>
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 transition-all duration-500"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>
      <p className="text-xs text-white/40 mt-1.5 text-right">
        {(xpNeeded - xpInLevel).toLocaleString()} XP to {levelTitles[level + 1] || 'Max Level'}
      </p>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const pushNotifications = usePushNotifications();
  const [copied, setCopied] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramCode, setTelegramCode] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  useEffect(() => {
    if (user?.id) fetchUserData();
  }, [user?.id]);

  const fetchUserData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setAchievements(data.data.achievements || []);
        refreshUser();
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Max 5MB');
      return;
    }

    setUploadingPhoto(true);
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
          toast.success('Updated!', 'Profile picture changed');
          refreshUser();
        }
      } catch (error) {
        toast.error('Failed', 'Please try again');
      }
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
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

  const handleLogout = () => {
    logout();
    setTimeout(() => navigate('/login'), 0);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center pb-24">
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
  const tier = getLevelTier(userLevel);

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Profile Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          {/* Content */}
          <div className="relative p-6">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Avatar with upload */}
                <label className="cursor-pointer relative">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                  <div className="relative">
                    <ProfileAvatar
                      name={userName}
                      photoUrl={user.profile_photo}
                      level={userLevel}
                      size="xl"
                      showLevel={false}
                    />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#0a1628] flex items-center justify-center">
                      <CameraIcon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </label>

                <div>
                  <h1 className="text-xl font-bold text-white">{userName}</h1>
                  <p className="text-emerald-400 text-sm">{levelTitles[userLevel] || 'Newcomer'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StarIcon className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="text-white font-medium">{userRating.toFixed(1)}</span>
                    <span className="text-white/40 text-sm">rating</span>
                  </div>
                </div>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {isDark ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5 text-slate-400" />}
              </button>
            </div>

            {/* Level Badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                <ZapIcon className="h-4 w-4 text-violet-400" />
                <span className="text-violet-400 font-bold">Level {userLevel}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <FlameIcon className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 font-medium">{streakDays} day streak</span>
              </div>
            </div>

            {/* XP Progress */}
            <XPProgress currentXP={userXP} level={userLevel} />
          </div>
        </div>
      </div>

      {/* Availability Selector - NEW! */}
      <AvailabilitySelector user={user} onUpdate={refreshUser} />

      {/* Stats Grid */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={BriefcaseIcon} label="Jobs Completed" value={jobsCompleted} color="emerald" />
          <StatCard icon={ZapIcon} label="Total XP" value={userXP.toLocaleString()} color="violet" />
          <StatCard icon={TrophyIcon} label="Achievements" value={achievements.length} color="amber" />
          <StatCard icon={SparklesIcon} label="Tier" value={tier.replace('Elite', '+')} color="cyan" />
        </div>
      </div>

      {/* Referral Card */}
      <div className="px-4 mt-6">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20" />
          <div className="absolute inset-0 border border-emerald-500/30 rounded-2xl" />
          <div className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShareIcon className="h-5 w-5 text-emerald-400" />
                <span className="text-white font-semibold">Referral Code</span>
              </div>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium">Earn $30</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl bg-[#0a1628] border border-white/[0.05]">
                <p className="font-mono text-xl text-white tracking-widest text-center">{referralCode}</p>
              </div>
              <button
                onClick={handleCopyReferral}
                className="p-3 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              >
                {copied ? <CheckIcon className="h-5 w-5" /> : <CopyIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-4 mt-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          Contact Info <span className="text-lg">📧</span>
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <MailIcon className="h-5 w-5 text-white/50" />
            </div>
            <span className="text-white">{user.email}</span>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-white/50" />
            </div>
            <span className="text-white">{user.phone || DEFAULTS.userPhone}</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-6 space-y-2">
        <MenuLink icon={UserIcon} label="Edit Profile" sublabel="Update your information" onClick={() => navigate('/complete-profile')} />
        <MenuLink icon={ShareIcon} label="Refer & Earn" sublabel="Invite friends, get $30" onClick={() => navigate('/referrals')} />
        <MenuLink icon={AwardIcon} label="Achievements" onClick={() => navigate('/achievements')} />
        <MenuLink icon={TrophyIcon} label="Leaderboard" onClick={() => navigate('/leaderboard')} />
        <MenuLink
          icon={MessageCircleIcon}
          label="Connect Telegram"
          sublabel={user.telegram_chat_id ? 'Connected' : 'Get notifications'}
          onClick={handleConnectTelegram}
          badge={user.telegram_chat_id ? '✓ Connected' : null}
        />
        {pushNotifications.isSupported && (
          <MenuLink
            icon={BellIcon}
            label="Push Notifications"
            sublabel={
              pushNotifications.permission === 'denied'
                ? 'Blocked in browser settings'
                : pushNotifications.isSubscribed
                  ? 'Receive instant alerts'
                  : 'Enable job alerts'
            }
            onClick={async () => {
              if (pushNotifications.isSubscribed) {
                const success = await pushNotifications.unsubscribe();
                if (success) toast.info('Disabled', 'Push notifications turned off');
              } else {
                const success = await pushNotifications.subscribe();
                if (success) {
                  toast.success('Enabled!', 'You will receive push notifications');
                } else if (pushNotifications.permission === 'denied') {
                  toast.error('Blocked', 'Please enable notifications in browser settings');
                }
              }
            }}
            badge={
              pushNotifications.isLoading ? '...' :
              pushNotifications.isSubscribed ? '✓ Enabled' : null
            }
          />
        )}
        <MenuLink icon={LogOutIcon} label="Log Out" onClick={handleLogout} danger />
      </div>

      {/* Telegram Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0a1628] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Connect Telegram</h3>
              <button onClick={() => setShowTelegramModal(false)} className="p-2 rounded-lg hover:bg-white/5">
                <XIcon className="h-5 w-5 text-white/50" />
              </button>
            </div>
            {telegramLoading ? (
              <div className="py-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-white/50">Generating code...</p>
              </div>
            ) : telegramCode ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-white/5 text-sm text-white/60">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open Telegram</li>
                    <li>Search for <span className="text-blue-400">@WorkLinkAdminBot</span></li>
                    <li>Send the code below</li>
                  </ol>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border-2 border-dashed border-white/20 text-center">
                  <span className="text-3xl font-mono font-bold text-white tracking-widest">{telegramCode.code}</span>
                </div>
                <a
                  href={telegramCode.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500 text-white font-medium"
                >
                  <ExternalLinkIcon className="h-5 w-5" />
                  Open Telegram
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
