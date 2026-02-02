import { useState, useEffect } from 'react';
import {
  WalletIcon,
  ArrowDownLeftIcon,
  ClockIcon,
  TrendingUpIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { formatMoney, DEFAULT_LOCALE, TIMEZONE, PAYMENT_STATUS_LABELS, getSGDateString } from '../utils/constants';
import { FilterTabs, EmptyState, LoadingSkeleton, StatusBadge, StatPod, SectionHeader } from '../components/common';

function TransactionItem({ payment }) {
  const isPaid = payment.status === 'paid';
  const Icon = isPaid ? ArrowDownLeftIcon : ClockIcon;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
      <div className={clsx(
        'w-12 h-12 rounded-2xl flex items-center justify-center border',
        isPaid ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-amber-500/20 border-amber-500/30'
      )}>
        <Icon className={clsx('h-5 w-5', isPaid ? 'text-emerald-400' : 'text-amber-400')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {payment.job_title || 'Job Payment'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-white/40 text-sm">
            {new Date(payment.created_at).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', timeZone: TIMEZONE })}
          </span>
          <StatusBadge status={payment.status} type="payment" size="sm" showBorder />
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

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'paid', label: 'Completed' },
  ];

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Main Balance Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
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

            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-white mb-1">
                {balanceHidden ? '••••••' : `$${formatMoney(stats.thisMonth)}`}
              </p>
              <p className="text-white/40 text-sm">SGD earned this month</p>
            </div>

            <div className="flex gap-3">
              <StatPod label="Pending" value={`$${formatMoney(stats.pending)}`} icon={ClockIcon} color="amber" hidden={balanceHidden} className="flex-1" />
              <StatPod label="Total Earned" value={`$${formatMoney(stats.total)}`} icon={TrendingUpIcon} color="emerald" hidden={balanceHidden} className="flex-1" />
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-emerald-400" />
            Transactions
          </h2>
          <span className="text-white/40 text-sm">{filteredPayments.length} total</span>
        </div>

        <div className="mb-4">
          <FilterTabs tabs={tabs} activeFilter={filter} onFilterChange={setFilter} />
        </div>

        {loading ? (
          <LoadingSkeleton count={3} height="h-20" />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No transactions yet"
            description="Complete jobs to start earning"
          />
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
