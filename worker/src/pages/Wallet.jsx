import { useState, useEffect } from 'react';
import {
  WalletIcon,
  ArrowDownLeftIcon,
  ClockIcon,
  TrendingUpIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronRightIcon,
  SparklesIcon,
  CalendarIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { formatMoney, DEFAULT_LOCALE, TIMEZONE, PAYMENT_STATUS_LABELS, getSGDateString } from '../utils/constants';

function TransactionItem({ payment }) {
  const statusConfig = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: ClockIcon },
    approved: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: ClockIcon },
    processing: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', icon: ClockIcon },
    paid: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: ArrowDownLeftIcon },
  };

  const config = statusConfig[payment.status] || statusConfig.pending;
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] || PAYMENT_STATUS_LABELS.pending;
  const isPaid = payment.status === 'paid';
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
      <div className={clsx(
        'w-12 h-12 rounded-2xl flex items-center justify-center',
        config.bg, 'border', config.border
      )}>
        <Icon className={clsx('h-5 w-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {payment.job_title || 'Job Payment'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-white/40 text-sm">
            {new Date(payment.created_at).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', timeZone: TIMEZONE })}
          </span>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.color, 'border', config.border)}>
            {statusLabel}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className={clsx('font-bold text-lg', isPaid ? 'text-emerald-400' : 'text-white')}>
          {isPaid ? '+' : ''}${formatMoney(payment.total_amount)}
        </p>
      </div>
    </div>
  );
}

function StatPod({ label, value, icon: Icon, color = 'emerald', hidden = false }) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  };

  return (
    <div className={clsx(
      'flex-1 p-4 rounded-2xl border bg-gradient-to-br',
      colorClasses[color].split(' ').slice(0, 3).join(' ')
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('h-4 w-4', colorClasses[color].split(' ').slice(-1))} />
        <span className="text-white/50 text-xs">{label}</span>
      </div>
      <p className={clsx('text-2xl font-bold', colorClasses[color].split(' ').slice(-1))}>
        {hidden ? '••••' : value}
      </p>
    </div>
  );
}

export default function Wallet() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [balanceHidden, setBalanceHidden] = useState(false);

  useEffect(() => {
    if (user) fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/v1/payments?candidate_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);

        const total = data.data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.total_amount, 0);
        const pending = data.data.filter(p => p.status === 'pending' || p.status === 'approved').reduce((sum, p) => sum + p.total_amount, 0);
        const currentMonth = getSGDateString().substring(0, 7);
        const thisMonth = data.data.filter(p => {
          const paymentMonth = getSGDateString(p.created_at).substring(0, 7);
          return p.status === 'paid' && paymentMonth === currentMonth;
        }).reduce((sum, p) => sum + p.total_amount, 0);

        setStats({ total, pending, thisMonth });
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'pending') return p.status === 'pending' || p.status === 'approved';
    if (filter === 'paid') return p.status === 'paid';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Main Balance Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          
          {/* Glow orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          
          {/* Border */}
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />
          
          {/* Content */}
          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <WalletIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/50 text-sm">My Wallet</p>
                  <p className="text-white font-medium">This Month</p>
                </div>
              </div>
              <button 
                onClick={() => setBalanceHidden(!balanceHidden)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {balanceHidden ? <EyeOffIcon className="h-5 w-5 text-white/50" /> : <EyeIcon className="h-5 w-5 text-white/50" />}
              </button>
            </div>

            {/* Main Balance */}
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-white mb-1">
                {balanceHidden ? '••••••' : `$${formatMoney(stats.thisMonth)}`}
              </p>
              <p className="text-white/40 text-sm">SGD earned this month</p>
            </div>

            {/* Stats Row */}
            <div className="flex gap-3">
              <StatPod 
                label="Pending" 
                value={`$${formatMoney(stats.pending)}`}
                icon={ClockIcon}
                color="amber"
                hidden={balanceHidden}
              />
              <StatPod 
                label="Total Earned" 
                value={`$${formatMoney(stats.total)}`}
                icon={TrendingUpIcon}
                color="emerald"
                hidden={balanceHidden}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05] text-center">
            <p className="text-2xl font-bold text-white">{user?.total_jobs_completed || 0}</p>
            <p className="text-xs text-white/40 mt-1">Jobs Done</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05] text-center">
            <p className="text-2xl font-bold text-amber-400">{payments.filter(p => p.status === 'pending').length}</p>
            <p className="text-xs text-white/40 mt-1">Pending</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0a1628]/80 border border-white/[0.05] text-center">
            <p className="text-2xl font-bold text-violet-400">${formatMoney(user?.total_incentives_earned || 0)}</p>
            <p className="text-xs text-white/40 mt-1">Bonuses</p>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Transactions
            <span className="text-lg">💳</span>
          </h2>
          <span className="text-white/40 text-sm">{filteredPayments.length} total</span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'paid', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-[#0a1628] animate-pulse" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]">
            <WalletIcon className="h-16 w-16 mx-auto mb-4 text-white/10" />
            <h3 className="text-white font-semibold mb-2">No transactions yet</h3>
            <p className="text-white/40 text-sm">Complete jobs to start earning</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0a1628]/50 border border-white/[0.05] divide-y divide-white/[0.05] overflow-hidden">
            {filteredPayments.map(payment => (
              <TransactionItem key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
