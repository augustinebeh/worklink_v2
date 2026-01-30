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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

// Level titles
const levelTitles = {
  1: 'Rookie',
  2: 'Starter',
  3: 'Active',
  4: 'Reliable',
  5: 'Pro',
  6: 'Expert',
  7: 'Elite',
  8: 'Master',
  9: 'Legend',
  10: 'Champion',
};

const xpThresholds = [0, 500, 1200, 2500, 5000, 8000, 12000, 18000, 25000, 35000];

function StatItem({ icon: Icon, label, value, color = 'primary' }) {
  const colorClasses = {
    primary: 'text-primary-400 bg-primary-500/20',
    accent: 'text-accent-400 bg-accent-500/20',
    gold: 'text-gold-400 bg-gold-500/20',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50">
      <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-dark-500">{label}</p>
        <p className="font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function MenuLink({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between p-4 rounded-xl transition-colors',
        danger ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-dark-800/50 hover:bg-dark-800'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={clsx('h-5 w-5', danger ? 'text-red-400' : 'text-dark-400')} />
        <span className={danger ? 'text-red-400' : 'text-white'}>{label}</span>
      </div>
      <ChevronRightIcon className={clsx('h-5 w-5', danger ? 'text-red-400' : 'text-dark-500')} />
    </button>
  );
}

function XPProgressBar({ currentXP, level }) {
  const safeLevel = level || 1;
  const safeXP = currentXP || 0;
  const currentThreshold = xpThresholds[safeLevel - 1] || 0;
  const nextThreshold = xpThresholds[safeLevel] || xpThresholds[xpThresholds.length - 1];
  const xpInLevel = safeXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = safeLevel >= 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm',
            safeLevel >= 8 ? 'bg-gold-900/50 text-gold-300 border border-gold-500/30' :
            safeLevel >= 5 ? 'bg-primary-900/50 text-primary-300 border border-primary-500/30' :
            'bg-dark-700 text-dark-300'
          )}>
            Lv.{safeLevel}
          </span>
          <span className="text-sm text-dark-300">{levelTitles[safeLevel] || 'Newcomer'}</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-accent-400">{xpInLevel.toLocaleString()}</span>
          <span className="text-dark-400"> / {xpNeeded.toLocaleString()} XP</span>
        </div>
      </div>
      
      <div className="h-3 bg-dark-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {safeLevel < 10 && (
        <p className="text-xs text-dark-500 mt-1.5 text-right">
          {(xpNeeded - xpInLevel).toLocaleString()} XP to {levelTitles[safeLevel + 1]}
        </p>
      )}
    </div>
  );
}

function LevelBadgeSimple({ level }) {
  const safeLevel = level || 1;
  const isElite = safeLevel >= 8;
  const isPro = safeLevel >= 5;

  return (
    <div 
      className={clsx(
        'flex items-center justify-center rounded-full font-bold h-10 w-10 text-sm',
        isElite ? 'bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-dark-900' :
        isPro ? 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white' :
        'bg-dark-700 text-dark-300',
      )}
    >
      {safeLevel}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center pb-24">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">Please log in to view your profile</p>
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
  const userLevel = user.level || 1;
  const userXP = user.xp || 0;
  const userRating = user.rating || 0;
  const userEmail = user.email || '';
  const userPhone = user.phone || 'Not set';
  const referralCode = user.referral_code || 'N/A';
  const jobsCompleted = user.total_jobs_completed || 0;
  const streakDays = user.streak_days || 0;
  
  // Handle certifications - might be string or array
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
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary-900/30 to-dark-950 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>

        {/* Profile card */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center border-2 border-primary-400">
              <span className="text-3xl font-bold text-white">{userName.charAt(0)}</span>
            </div>
            <div className="absolute -bottom-2 -right-2">
              <LevelBadgeSimple level={userLevel} />
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{userName}</h2>
            <p className="text-primary-400 text-sm">{levelTitles[userLevel] || 'Newcomer'}</p>
            <div className="flex items-center gap-2 mt-1">
              <StarIcon className="h-4 w-4 text-gold-400 fill-gold-400" />
              <span className="text-white font-medium">{userRating.toFixed(1)}</span>
              <span className="text-dark-500 text-sm">rating</span>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-6">
          <XPProgressBar currentXP={userXP} level={userLevel} />
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

        {/* Referral Code */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-900/30 to-accent-800/10 border border-accent-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShareIcon className="h-5 w-5 text-accent-400" />
              <span className="font-medium text-white">Referral Code</span>
            </div>
            <span className="text-xs text-accent-400">Earn $30 per referral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-white/10">
              <p className="font-mono text-lg text-white">{referralCode}</p>
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
            <h3 className="text-lg font-semibold text-white mb-3">Certifications</h3>
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
          <h3 className="text-lg font-semibold text-white mb-3">Contact Info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/50">
              <MailIcon className="h-5 w-5 text-dark-400" />
              <span className="text-white">{userEmail}</span>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/50">
              <PhoneIcon className="h-5 w-5 text-dark-400" />
              <span className="text-white">{userPhone}</span>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="space-y-2">
          <MenuLink icon={AwardIcon} label="Achievements" onClick={() => navigate('/achievements')} />
          <MenuLink icon={TrophyIcon} label="Leaderboard" onClick={() => navigate('/leaderboard')} />
          <MenuLink icon={LogOutIcon} label="Log Out" onClick={handleLogout} danger />
        </div>
      </div>
    </div>
  );
}
