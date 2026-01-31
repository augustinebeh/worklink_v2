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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

const tierColors = {
  1: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Bronze' },
  2: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/30', label: 'Silver' },
  3: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Gold' },
  4: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Platinum' },
};

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'text-primary-400 bg-primary-500/20',
    accent: 'text-accent-400 bg-accent-500/20',
    gold: 'text-yellow-400 bg-yellow-500/20',
    green: 'text-emerald-400 bg-emerald-500/20',
  };

  return (
    <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
      <div className={clsx('p-2 rounded-lg w-fit mb-2', colors[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-dark-400">{label}</p>
    </div>
  );
}

function TierProgress({ currentTier, tiers, totalEarned }) {
  const current = tiers?.find(t => t.tier_level === currentTier) || tiers?.[0];
  const next = tiers?.find(t => t.tier_level === currentTier + 1);

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-900/40 to-dark-900 border border-primary-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-primary-400" />
          <span className="font-semibold text-white">Your Tier</span>
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
                : 'bg-dark-800 text-dark-500 border-dark-700'
            )}>
              ${tier.bonus_amount}
            </div>
            <span className="text-xs text-dark-500 mt-1">{tier.jobs_required}+ jobs</span>
          </div>
        ))}
      </div>

      {next && (
        <div className="text-center text-sm">
          <span className="text-dark-400">Next tier: </span>
          <span className="text-primary-400 font-medium">${next.bonus_amount} bonus</span>
          <span className="text-dark-400"> at {next.jobs_required} jobs</span>
        </div>
      )}
    </div>
  );
}

function ReferralCard({ referral }) {
  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400',
    registered: 'bg-blue-500/20 text-blue-400',
    bonus_paid: 'bg-emerald-500/20 text-emerald-400',
  };

  const statusLabels = {
    pending: 'Pending',
    registered: 'Signed Up',
    bonus_paid: 'Bonus Paid!',
  };

  return (
    <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
            <span className="text-primary-400 font-bold">{referral.referred_name?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className="font-medium text-white">{referral.referred_name}</p>
            <p className="text-xs text-dark-500">{referral.referred_jobs || 0} jobs completed</p>
          </div>
        </div>
        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[referral.status])}>
          {statusLabels[referral.status]}
        </span>
      </div>
      {referral.total_bonus_paid > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-sm text-dark-400">You earned</span>
          <span className="font-semibold text-emerald-400">${referral.total_bonus_paid}</span>
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center pb-24">
        <p className="text-dark-400">Please log in to view referrals</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center pb-24">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-accent-900/30 to-dark-950 px-4 pt-4 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Refer & Earn</h1>
        <p className="text-dark-400">Invite friends and earn bonuses together!</p>
      </div>

      <div className="px-4 space-y-6">
        {/* Referral Code Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-accent-900/40 to-accent-800/20 border border-accent-500/20">
          <div className="flex items-center gap-2 mb-3">
            <GiftIcon className="h-5 w-5 text-accent-400" />
            <span className="font-medium text-white">Your Referral Code</span>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 px-4 py-3 rounded-xl bg-dark-900/80 border border-white/10">
              <p className="font-mono text-xl text-white text-center tracking-wider">
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

          <p className="text-sm text-accent-300 text-center">
            You both get <span className="font-bold">${data?.currentTier?.bonus_amount || 30}</span> when they complete their first job!
          </p>
        </div>

        {/* Share Buttons */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Share via</h3>
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
              icon={CopyIcon} 
              label="Link" 
              color="bg-dark-700 text-white hover:bg-dark-600"
              onClick={() => handleShare('copy')}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={UsersIcon} label="Total Referrals" value={data?.stats?.totalReferrals || 0} color="primary" />
          <StatCard icon={DollarSignIcon} label="Total Earned" value={`$${data?.stats?.totalEarned || 0}`} color="green" />
        </div>

        {/* Tier Progress */}
        {data?.tiers && (
          <TierProgress 
            currentTier={data?.currentTier?.tier_level || 1} 
            tiers={data?.tiers}
            totalEarned={data?.stats?.totalEarned}
          />
        )}

        {/* Your Referrals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Your Referrals</h3>
            <span className="text-sm text-dark-400">{data?.referrals?.length || 0} friends</span>
          </div>

          {data?.referrals?.length > 0 ? (
            <div className="space-y-3">
              {data.referrals.map((referral) => (
                <ReferralCard key={referral.id} referral={referral} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 rounded-xl bg-dark-800/50 border border-white/5">
              <UsersIcon className="h-10 w-10 text-dark-600 mx-auto mb-2" />
              <p className="text-dark-400">No referrals yet</p>
              <p className="text-sm text-dark-500 mt-1">Share your code to start earning!</p>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Top Referrers</h3>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((leader, idx) => (
                <div 
                  key={leader.id}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-xl',
                    idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                    idx === 1 ? 'bg-slate-400/10 border border-slate-400/20' :
                    idx === 2 ? 'bg-amber-600/10 border border-amber-600/20' :
                    'bg-dark-800/50 border border-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                      idx === 0 ? 'bg-yellow-500 text-dark-900' :
                      idx === 1 ? 'bg-slate-400 text-dark-900' :
                      idx === 2 ? 'bg-amber-600 text-white' :
                      'bg-dark-700 text-dark-400'
                    )}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-white">{leader.name}</span>
                    {leader.id === user?.id && (
                      <span className="text-xs text-primary-400">(You)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{leader.successful_referrals}</p>
                    <p className="text-xs text-dark-500">referrals</p>
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
