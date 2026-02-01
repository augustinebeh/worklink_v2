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
import { formatMoney, DEFAULT_LOCALE, TIMEZONE, PAYMENT_STATUS_LABELS, getSGDateString } from '../utils/constants';

function TransactionItem({ payment, isDark }) {
  const statusConfig = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    approved: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    processing: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    paid: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  };

  const config = statusConfig[payment.status] || statusConfig.pending;
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] || PAYMENT_STATUS_LABELS.pending;
  const isPaid = payment.status === 'paid';

  return (
    <div className="flex items-center gap-4 p-4">
      <div className={clsx(
        'w-11 h-11 rounded-xl flex items-center justify-center border',
        config.bg, config.border
      )}>
        {isPaid ? (
          <ArrowDownLeftIcon className={clsx('h-5 w-5', config.color)} />
        ) : (
          <ClockIcon className={clsx('h-5 w-5', config.color)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', isDark ? 'text-white' : 'text-slate-900')}>
          {payment.job_title || 'Job Payment'}
        </p>
        <p className={clsx('text-sm', isDark ? 'text-dark-500' : 'text-slate-500')}>
          {new Date(payment.created_at).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE })}
        </p>
      </div>
      <div className="text-right">
        <p className={clsx(
          'font-bold text-lg',
          isPaid ? 'text-emerald-400' : isDark ? 'text-white' : 'text-slate-900'
        )}
        style={isPaid && isDark ? { textShadow: '0 0 20px rgba(52,211,153,0.3)' } : undefined}
        >
          {isPaid ? '+' : ''}${formatMoney(payment.total_amount)}
        </p>
        <p className={clsx('text-xs font-medium', config.color)}>{statusLabel}</p>
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

        // Calculate stats (Singapore timezone)
        const total = data.data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.total_amount, 0);
        const pending = data.data.filter(p => p.status === 'pending' || p.status === 'approved').reduce((sum, p) => sum + p.total_amount, 0);
        const currentMonth = getSGDateString().substring(0, 7); // YYYY-MM
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
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-transparent')}>
      {/* Balance Card - Glassmorphism */}
      <div className="px-4 py-4">
        <div className={clsx(
          'relative overflow-hidden rounded-3xl p-6 backdrop-blur-xl border',
          isDark
            ? 'bg-gradient-to-br from-[#080810] via-[#0c0d1a] to-[#0f1020] border-white/[0.08]'
            : 'bg-gradient-to-br from-[#007AFF] via-[#0062FF] to-[#0055EB] border-transparent shadow-[0_15px_50px_rgba(0,122,255,0.25)]'
        )}>
          {/* Background gradient blobs */}
          <div className={clsx(
            'absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4',
            isDark ? 'bg-emerald-500/15' : 'bg-white/30'
          )} />
          <div className={clsx(
            'absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4',
            isDark ? 'bg-violet-500/15' : 'bg-white/20'
          )} />

          {/* Content container */}
          <div className="relative">
            {/* Balance Label */}
            <div className="flex items-center gap-2 mb-2">
              <WalletIcon className={clsx('h-5 w-5', isDark ? 'text-emerald-400' : 'text-white/80')} />
              <span className="text-white/70 text-sm font-medium">This Month</span>
              <button onClick={() => setBalanceHidden(!balanceHidden)} className="text-white/50 hover:text-white/70 transition-colors">
                {balanceHidden ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>

            {/* Balance Amount - High contrast */}
            <p
              className="text-4xl font-bold text-white tracking-tight mb-1"
              style={isDark ? { textShadow: '0 0 30px rgba(52,211,153,0.3)' } : undefined}
            >
              {balanceHidden ? '••••••' : `$${formatMoney(stats.thisMonth)}`}
            </p>
            <p className="text-white/50 text-sm">SGD</p>

            {/* Stats Grid - Glass Pods */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className={clsx(
                'p-4 rounded-2xl backdrop-blur-md border',
                isDark
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-white/15 border-white/20'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <ClockIcon className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-white/70">Pending</span>
                </div>
                <p
                  className="text-2xl font-bold text-amber-400"
                  style={isDark ? { textShadow: '0 0 20px rgba(251,191,36,0.3)' } : undefined}
                >
                  {balanceHidden ? '••••' : `$${formatMoney(stats.pending)}`}
                </p>
              </div>
              <div className={clsx(
                'p-4 rounded-2xl backdrop-blur-md border',
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-white/15 border-white/20'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUpIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-white/70">Total Earned</span>
                </div>
                <p
                  className="text-2xl font-bold text-emerald-400"
                  style={isDark ? { textShadow: '0 0 20px rgba(52,211,153,0.3)' } : undefined}
                >
                  {balanceHidden ? '••••' : `$${formatMoney(stats.total)}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Glass Pods */}
      <div className="px-4 mb-4">
        <div className="flex gap-3">
          <div className={clsx(
            'flex-1 p-4 rounded-2xl text-center border backdrop-blur-md',
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          )}>
            <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              {user?.total_jobs_completed || 0}
            </p>
            <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>Jobs Done</p>
          </div>
          <div className={clsx(
            'flex-1 p-4 rounded-2xl text-center border backdrop-blur-md',
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          )}>
            <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              {payments.filter(p => p.status === 'pending').length}
            </p>
            <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>Pending</p>
          </div>
          <div className={clsx(
            'flex-1 p-4 rounded-2xl text-center border backdrop-blur-md',
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          )}>
            <p className={clsx('text-2xl font-bold text-emerald-400', isDark && 'drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]')}>
              ${formatMoney(user?.total_incentives_earned || 0)}
            </p>
            <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>Bonuses</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>Transactions</h2>
        </div>

        {/* Filter tabs - Glass style */}
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
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                filter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/25'
                  : isDark
                    ? 'bg-white/5 border-white/10 text-dark-400 hover:bg-white/10 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className={clsx(
            'text-center py-12 rounded-2xl backdrop-blur-md border',
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
          )}>
            <WalletIcon className={clsx('h-12 w-12 mx-auto mb-3', isDark ? 'text-dark-500' : 'text-slate-300')} />
            <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>No transactions yet</p>
          </div>
        ) : (
          <div className={clsx(
            'rounded-2xl backdrop-blur-md border divide-y overflow-hidden',
            isDark
              ? 'bg-white/[0.03] border-white/[0.08] divide-white/[0.05]'
              : 'bg-white border-slate-200 divide-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
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
