import { useState, useEffect } from 'react';
import {
  ShareIcon,
  CopyIcon,
  CheckIcon,
  UsersIcon,
  DollarSignIcon,
  TrophyIcon,
  ChevronRightIcon,
  GiftIcon,
  StarIcon,
  MessageCircleIcon,
  SendIcon,
  LinkIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { formatMoney, REFERRAL_STATUS_LABELS } from '../utils/constants';

const tierColors = {
  1: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Bronze' },
  2: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/30', label: 'Silver' },
  3: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Gold' },
  4: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Platinum' },
};

function StatCard({ icon: Icon, label, value, color = 'primary', isDark }) {
  const colors = {
    primary: 'text-primary-400 bg-primary-500/20',
    accent: 'text-accent-400 bg-accent-500/20',
    gold: 'text-yellow-400 bg-yellow-500/20',
    green: 'text-emerald-400 bg-emerald-500/20',
  };

  return (
    <div className={clsx(
      'p-4 rounded-xl border',
      isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    )}>
      <div className={clsx('p-2 rounded-lg w-fit mb-2', colors[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>{label}</p>
    </div>
  );
}

function TierProgress({ currentTier, tiers, totalEarned, isDark }) {
  const current = tiers?.find(t => t.tier_level === currentTier) || tiers?.[0];
  const next = tiers?.find(t => t.tier_level === currentTier + 1);

  return (
    <div className={clsx(
      'p-4 rounded-2xl border',
      isDark
        ? 'bg-gradient-to-br from-primary-900/40 to-dark-900 border-primary-500/20'
        : 'bg-gradient-to-br from-primary-50 to-white border-primary-200'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-primary-400" />
          <span className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Your Tier</span>
        </div>
        <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', tierColors[currentTier]?.bg, tierColors[currentTier]?.text)}>
          {tierColors[currentTier]?.label || 'Bronze'}
        </span>
      </div>

      {/* Tier badges */}
      <div className="flex justify-between mb-4">
        {tiers?.map((tier) => (
          <div key={tier.tier_level} className="flex flex-col items-center">
            <div className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2',
              tier.tier_level <= currentTier
                ? `${tierColors[tier.tier_level]?.bg} ${tierColors[tier.tier_level]?.text} ${tierColors[tier.tier_level]?.border}`
                : isDark
                  ? 'bg-dark-800 text-dark-500 border-dark-700'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
            )}>
              ${Number(tier.bonus_amount).toFixed(0)}
            </div>
            <span className={clsx('text-xs mt-1', isDark ? 'text-dark-500' : 'text-slate-400')}>{tier.jobs_required}+ jobs</span>
          </div>
        ))}
      </div>

      {next && (
        <div className="text-center text-sm">
          <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Next tier: </span>
          <span className="text-primary-400 font-medium">${formatMoney(next.bonus_amount)} bonus</span>
          <span className={isDark ? 'text-dark-400' : 'text-slate-500'}> at {next.jobs_required} jobs</span>
        </div>
      )}
    </div>
  );
}

function ReferralCard({ referral, isDark }) {
  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400',
    registered: 'bg-blue-500/20 text-blue-400',
    bonus_paid: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className={clsx(
      'p-4 rounded-xl border',
      isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
            <span className="text-primary-400 font-bold">{referral.referred_name?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{referral.referred_name}</p>
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>{referral.referred_jobs || 0} jobs completed</p>
          </div>
        </div>
        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[referral.status])}>
          {REFERRAL_STATUS_LABELS[referral.status] || 'Pending'}
        </span>
      </div>
      {referral.total_bonus_paid > 0 && (
        <div className={clsx(
          'mt-3 pt-3 border-t flex items-center justify-between',
          isDark ? 'border-white/5' : 'border-slate-100'
        )}>
          <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>You earned</span>
          <span className="font-semibold text-emerald-400">${formatMoney(referral.total_bonus_paid)}</span>
        </div>
      )}
    </div>
  );
}

function ShareButton({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-colors',
        color
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default function Referrals() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchReferralData();
      fetchLeaderboard();
    }
  }, [user?.id]);

  const fetchReferralData = async () => {
    try {
      const res = await fetch(`/api/v1/referrals/dashboard/${user.id}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/v1/referrals/leaderboard?limit=10');
      const result = await res.json();
      if (result.success) setLeaderboard(result.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleCopy = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      setCopied(true);
      toast.success('Copied!', 'Referral code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (type) => {
    if (!data?.shareLinks) return;

    switch (type) {
      case 'whatsapp':
        window.open(data.shareLinks.whatsapp, '_blank');
        break;
      case 'telegram':
        window.open(data.shareLinks.telegram, '_blank');
        break;
      case 'sms':
        window.location.href = data.shareLinks.sms;
        break;
      case 'copy':
        navigator.clipboard.writeText(data.shareLinks.web);
        setLinkCopied(true);
        toast.success('Link Copied!', 'Share link copied to clipboard');
        setTimeout(() => setLinkCopied(false), 2000);
        break;
    }
  };

  if (!user) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
        <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>Please log in to view referrals</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'px-4 pt-4 pb-6',
        isDark
          ? 'bg-gradient-to-b from-accent-900/30 to-dark-950'
          : 'bg-gradient-to-b from-emerald-100 to-slate-50'
      )}>
        <h1 className={clsx('text-2xl font-bold mb-2', isDark ? 'text-white' : 'text-slate-900')}>Refer & Earn</h1>
        <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>Invite friends and earn bonuses together!</p>
      </div>

      <div className="px-4 space-y-6">
        {/* Referral Code Card */}
        <div className={clsx(
          'p-5 rounded-2xl border',
          isDark
            ? 'bg-gradient-to-r from-accent-900/40 to-accent-800/20 border-accent-500/20'
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
        )}>
          <div className="flex items-center gap-2 mb-3">
            <GiftIcon className="h-5 w-5 text-accent-400" />
            <span className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>Your Referral Code</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className={clsx(
              'flex-1 px-4 py-3 rounded-xl border',
              isDark ? 'bg-dark-900/80 border-white/10' : 'bg-white border-slate-200'
            )}>
              <p className={clsx('font-mono text-xl text-center tracking-wider', isDark ? 'text-white' : 'text-slate-900')}>
                {data?.referralCode || 'N/A'}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="p-3 rounded-xl bg-accent-500 text-white"
            >
              {copied ? <CheckIcon className="h-6 w-6" /> : <CopyIcon className="h-6 w-6" />}
            </button>
          </div>

          <p className={clsx('text-sm text-center', isDark ? 'text-accent-300' : 'text-emerald-600')}>
            You both get <span className="font-bold">${formatMoney(data?.currentTier?.bonus_amount || 30)}</span> when they complete their first job!
          </p>
        </div>

        {/* Share Buttons */}
        <div>
          <h3 className={clsx('text-lg font-semibold mb-3', isDark ? 'text-white' : 'text-slate-900')}>Share via</h3>
          <div className="flex gap-3">
            <ShareButton
              icon={MessageCircleIcon}
              label="WhatsApp"
              color="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
              onClick={() => handleShare('whatsapp')}
            />
            <ShareButton
              icon={SendIcon}
              label="Telegram"
              color="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              onClick={() => handleShare('telegram')}
            />
            <ShareButton
              icon={ShareIcon}
              label="SMS"
              color="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
              onClick={() => handleShare('sms')}
            />
            <ShareButton
              icon={linkCopied ? CheckIcon : LinkIcon}
              label={linkCopied ? 'Copied!' : 'Link'}
              color={linkCopied
                ? 'bg-accent-500/20 text-accent-400'
                : isDark ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
              onClick={() => handleShare('copy')}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={UsersIcon} label="Total Referrals" value={data?.stats?.totalReferrals || 0} color="primary" isDark={isDark} />
          <StatCard icon={DollarSignIcon} label="Total Earned" value={`$${formatMoney(data?.stats?.totalEarned)}`} color="green" isDark={isDark} />
        </div>

        {/* Tier Progress */}
        {data?.tiers && (
          <TierProgress
            currentTier={data?.currentTier?.tier_level || 1}
            tiers={data?.tiers}
            totalEarned={data?.stats?.totalEarned}
            isDark={isDark}
          />
        )}

        {/* Your Referrals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Your Referrals</h3>
            <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>{data?.referrals?.length || 0} friends</span>
          </div>

          {data?.referrals?.length > 0 ? (
            <div className="space-y-3">
              {data.referrals.map((referral) => (
                <ReferralCard key={referral.id} referral={referral} isDark={isDark} />
              ))}
            </div>
          ) : (
            <div className={clsx(
              'text-center py-8 rounded-xl border',
              isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200'
            )}>
              <UsersIcon className={clsx('h-10 w-10 mx-auto mb-2', isDark ? 'text-dark-600' : 'text-slate-300')} />
              <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>No referrals yet</p>
              <p className={clsx('text-sm mt-1', isDark ? 'text-dark-500' : 'text-slate-400')}>Share your code to start earning!</p>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon className="h-5 w-5 text-yellow-400" />
              <h3 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Top Referrers</h3>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((leader, idx) => (
                <div
                  key={leader.id}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-xl border',
                    idx === 0 ? 'bg-yellow-500/10 border-yellow-500/20' :
                    idx === 1 ? 'bg-slate-400/10 border-slate-400/20' :
                    idx === 2 ? 'bg-amber-600/10 border-amber-600/20' :
                    isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                      idx === 0 ? 'bg-yellow-500 text-dark-900' :
                      idx === 1 ? 'bg-slate-400 text-dark-900' :
                      idx === 2 ? 'bg-amber-600 text-white' :
                      isDark ? 'bg-dark-700 text-dark-400' : 'bg-slate-200 text-slate-500'
                    )}>
                      {idx + 1}
                    </span>
                    <span className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{leader.name}</span>
                    {leader.id === user?.id && (
                      <span className="text-xs text-primary-400">(You)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{leader.successful_referrals}</p>
                    <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>referrals</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
