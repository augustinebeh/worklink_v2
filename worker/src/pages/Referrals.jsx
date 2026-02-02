import { useState, useEffect } from 'react';
import {
  GiftIcon,
  CopyIcon,
  CheckIcon,
  UsersIcon,
  ShareIcon,
  UserPlusIcon,
  LightbulbIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { EmptyState, LoadingSkeleton, StatusBadge } from '../components/common';

function ReferralItem({ referral }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        <UserPlusIcon className="h-5 w-5 text-white/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{referral.referred_name || 'New User'}</p>
        <p className="text-white/40 text-sm">{new Date(referral.created_at).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <StatusBadge status={referral.status} type="referral" />
        {referral.reward_amount > 0 && (
          <p className="text-emerald-400 text-sm font-medium mt-1">+${referral.reward_amount}</p>
        )}
      </div>
    </div>
  );
}

export default function Referrals() {
  const { user } = useAuth();
  const toast = useToast();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) fetchReferrals();
  }, [user]);

  const fetchReferrals = async () => {
    try {
      const res = await fetch(`/api/v1/referrals?referrer_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setReferrals(data.data || []);
        const total = data.data?.length || 0;
        const pending = data.data?.filter(r => r.status === 'pending').length || 0;
        const earned = data.data?.filter(r => r.status === 'rewarded').reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;
        setStats({ total, pending, earned });
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      toast.success('Copied!', 'Referral code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Join WorkLink',
      text: `Use my referral code ${user?.referral_code} to join WorkLink and we both get $30!`,
      url: `https://worklink.app/join?ref=${user?.referral_code}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopy();
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <GiftIcon className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Refer & Earn</h1>
                <p className="text-white/50">Invite friends, get $30 each</p>
              </div>
            </div>

            {/* Referral Code */}
            <div className="mb-4">
              <p className="text-white/50 text-sm mb-2">Your Referral Code</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-3 rounded-xl bg-[#0a1628] border border-white/[0.05]">
                  <p className="font-mono text-2xl text-white tracking-widest text-center">
                    {user?.referral_code || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  {copied ? <CheckIcon className="h-6 w-6" /> : <CopyIcon className="h-6 w-6" />}
                </button>
                <button
                  onClick={handleShare}
                  className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                >
                  <ShareIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-white/5 text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/40">Referrals</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                <p className="text-xs text-white/40">Pending</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-2xl font-bold text-emerald-400">${stats.earned}</p>
                <p className="text-xs text-white/40">Earned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-4 mt-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          How It Works <LightbulbIcon className="h-5 w-5 text-amber-400" />
        </h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share your code', desc: 'Send your unique code to friends' },
            { step: '2', title: 'Friend signs up', desc: 'They register using your code' },
            { step: '3', title: 'Both get $30', desc: "You both earn once they're approved" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 font-bold">{item.step}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{item.title}</p>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral History */}
      <div className="px-4 mt-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          Your Referrals <UsersIcon className="h-5 w-5 text-violet-400" />
        </h2>

        {loading ? (
          <LoadingSkeleton count={3} height="h-16" />
        ) : referrals.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No referrals yet"
            description="Share your code to start earning"
            compact
          />
        ) : (
          <div className="rounded-2xl bg-[#0a1628]/50 border border-white/[0.05] divide-y divide-white/[0.05] overflow-hidden">
            {referrals.map(referral => (
              <ReferralItem key={referral.id} referral={referral} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
