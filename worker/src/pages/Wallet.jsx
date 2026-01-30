import { useState, useEffect } from 'react';
import { 
  WalletIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  BanknoteIcon,
  TrendingUpIcon,
  GiftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

function TransactionItem({ payment }) {
  const statusConfig = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: ClockIcon, label: 'Pending' },
    approved: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircleIcon, label: 'Approved' },
    processing: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: ClockIcon, label: 'Processing' },
    paid: { color: 'text-accent-400', bg: 'bg-accent-500/20', icon: CheckCircleIcon, label: 'Paid' },
  };

  const config = statusConfig[payment.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 border border-white/5">
      <div className={clsx('p-3 rounded-xl', config.bg)}>
        <BanknoteIcon className={clsx('h-5 w-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{payment.job_title || 'Job Payment'}</p>
        <p className="text-sm text-dark-400">
          {new Date(payment.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-white">${payment.total_amount?.toFixed(2)}</p>
        <div className="flex items-center gap-1 justify-end">
          <StatusIcon className={clsx('h-3 w-3', config.color)} />
          <span className={clsx('text-xs', config.color)}>{config.label}</span>
        </div>
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
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur-lg px-4 pt-safe pb-4 border-b border-white/5">
        <h1 className="text-2xl font-bold text-white">Wallet</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Balance card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <WalletIcon className="h-5 w-5 text-white/70" />
              <span className="text-white/70 text-sm">Total Earned</span>
            </div>
            <p className="text-4xl font-bold text-white">${stats.total.toFixed(2)}</p>
            
            <div className="flex items-center gap-4 mt-4">
              <div>
                <p className="text-white/50 text-xs">Pending</p>
                <p className="text-white font-semibold">${stats.pending.toFixed(2)}</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-white/50 text-xs">This Month</p>
                <p className="text-white font-semibold">${stats.thisMonth.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5 text-center">
            <TrendingUpIcon className="h-5 w-5 text-accent-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{user?.total_jobs_completed || 0}</p>
            <p className="text-xs text-dark-500">Jobs Done</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5 text-center">
            <ClockIcon className="h-5 w-5 text-primary-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{payments.filter(p => p.status === 'pending').length}</p>
            <p className="text-xs text-dark-500">Pending</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5 text-center">
            <GiftIcon className="h-5 w-5 text-gold-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">${user?.total_incentives_earned?.toFixed(0) || 0}</p>
            <p className="text-xs text-dark-500">Bonuses</p>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Transactions</h2>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'paid', label: 'Paid' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  filter === tab.id 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-dark-800 text-dark-400'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-dark-500">
              <WalletIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map(payment => (
                <TransactionItem key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
