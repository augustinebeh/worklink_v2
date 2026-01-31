import { useState, useEffect } from 'react';
import {
  WalletIcon,
  ArrowDownLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { formatMoney, DEFAULT_LOCALE, PAYMENT_STATUS_LABELS } from '../utils/constants';

function TransactionItem({ payment, isDark }) {
  const statusConfig = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20' },
    approved: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
    processing: { color: 'text-purple-400', bg: 'bg-purple-500/20' },
    paid: { color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  };

  const config = statusConfig[payment.status] || statusConfig.pending;
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] || PAYMENT_STATUS_LABELS.pending;
  const isPaid = payment.status === 'paid';

  return (
    <div className="flex items-center gap-4 p-4">
      <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center', config.bg)}>
        {isPaid ? (
          <ArrowDownLeftIcon className={clsx('h-5 w-5', config.color)} />
        ) : (
          <ClockIcon className={clsx('h-5 w-5', config.color)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', isDark ? 'text-white' : 'text-slate-900')}>{payment.job_title || 'Job Payment'}</p>
        <p className={clsx('text-sm', isDark ? 'text-dark-500' : 'text-slate-500')}>
          {new Date(payment.created_at).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className={clsx('font-semibold', isPaid ? 'text-emerald-400' : isDark ? 'text-white' : 'text-slate-900')}>
          {isPaid ? '+' : ''}${formatMoney(payment.total_amount)}
        </p>
        <p className={clsx('text-xs', config.color)}>{statusLabel}</p>
      </div>
    </div>
  );
}

export default function Wallet() {
  const { user } = useAuth();
  const { isDark } = useTheme();
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

        // Calculate stats
        const total = data.data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.total_amount, 0);
        const pending = data.data.filter(p => p.status === 'pending' || p.status === 'approved').reduce((sum, p) => sum + p.total_amount, 0);
        const thisMonth = data.data.filter(p => {
          const date = new Date(p.created_at);
          const now = new Date();
          return p.status === 'paid' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Balance Card */}
      <div className="px-4 py-4">
        <div className={clsx(
          'relative overflow-hidden rounded-3xl p-6 border',
          isDark
            ? 'bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#1a1a3e] border-white/5'
            : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 border-emerald-500/20'
        )}>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative">
            {/* Balance Label */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/70 text-sm">This Month</span>
              <button onClick={() => setBalanceHidden(!balanceHidden)} className="text-white/50">
                {balanceHidden ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>

            {/* Balance Amount */}
            <p className="text-4xl font-bold text-white tracking-tight mb-1">
              {balanceHidden ? '••••••' : `$${formatMoney(stats.thisMonth)}`}
            </p>
            <p className="text-white/60 text-sm">SGD</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <ClockIcon className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-white/70">Pending</span>
                </div>
                <p className="text-xl font-bold text-amber-400">
                  {balanceHidden ? '••••' : `$${formatMoney(stats.pending)}`}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-white/70">Total Earned</span>
                </div>
                <p className="text-xl font-bold text-emerald-400">
                  {balanceHidden ? '••••' : `$${formatMoney(stats.total)}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-3">
          <div className={clsx('flex-1 p-4 rounded-2xl text-center border', isDark ? 'bg-dark-900/50 border-white/5' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{user?.total_jobs_completed || 0}</p>
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-500')}>Jobs Done</p>
          </div>
          <div className={clsx('flex-1 p-4 rounded-2xl text-center border', isDark ? 'bg-dark-900/50 border-white/5' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{payments.filter(p => p.status === 'pending').length}</p>
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-500')}>Pending</p>
          </div>
          <div className={clsx('flex-1 p-4 rounded-2xl text-center border', isDark ? 'bg-dark-900/50 border-white/5' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>${formatMoney(user?.total_incentives_earned || 0)}</p>
            <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-500')}>Bonuses</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Transactions</h2>
        </div>

        {/* Filter tabs */}
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
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30'
                  : isDark
                    ? 'bg-dark-800/50 text-dark-400 border border-transparent'
                    : 'bg-slate-100 text-slate-500 border border-transparent'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className={clsx(
            'text-center py-12 rounded-2xl border',
            isDark ? 'bg-dark-900/50 border-white/5' : 'bg-white border-slate-200'
          )}>
            <WalletIcon className={clsx('h-12 w-12 mx-auto mb-3', isDark ? 'text-dark-600' : 'text-slate-300')} />
            <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>No transactions yet</p>
          </div>
        ) : (
          <div className={clsx(
            'rounded-2xl border divide-y overflow-hidden',
            isDark ? 'bg-dark-900/50 border-white/5 divide-white/5' : 'bg-white border-slate-200 divide-slate-100'
          )}>
            {filteredPayments.map(payment => (
              <TransactionItem key={payment.id} payment={payment} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
