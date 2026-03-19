import { useState, useEffect } from 'react';
import { BookOpenIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { FilterTabs, LoadingSkeleton, EmptyState } from '../components/common';
import TrainingCard from '../components/training/TrainingCard';
import TrainingDetail from '../components/training/TrainingDetail';

export default function Training() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [modules, setModules] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeModule, setActiveModule] = useState(null);

  useEffect(() => {
    if (user) fetchTraining();
  }, [user]);

  const fetchTraining = async () => {
    try {
      const [modulesRes, progressRes] = await Promise.all([
        fetch('/api/v1/training'),
        fetch(`/api/v1/training/progress/${user.id}`),
      ]);
      const modulesData = await modulesRes.json();
      const progressData = await progressRes.json();

      if (modulesData.success) setModules(modulesData.data || []);
      if (progressData.success) {
        const progressMap = {};
        (progressData.data || []).forEach(p => {
          progressMap[p.module_id] = p;
        });
        setUserProgress(progressMap);
      }
    } catch (error) {
      console.error('Failed to fetch training:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = (module) => {
    setActiveModule(module);
  };

  const handleCompleteModule = async (module) => {
    try {
      const res = await fetch(`/api/v1/training/${module.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Training Completed!', `+${module.xp_reward || 50} XP earned`);
        setActiveModule(null);
        fetchTraining();
        refreshUser?.();
      } else {
        toast.error('Failed', data.error || 'Could not complete training');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    }
  };

  const completedCount = Object.values(userProgress).filter(p => p.status === 'completed').length;
  const totalXP = modules.reduce((sum, m) => {
    if (userProgress[m.id]?.status === 'completed') return sum + (m.xp_reward || 50);
    return sum;
  }, 0);

  const filteredModules = modules.filter(m => {
    const progress = userProgress[m.id];
    if (filter === 'completed') return progress?.status === 'completed';
    if (filter === 'available') return progress?.status !== 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <BookOpenIcon className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Training</h1>
                <p className="text-white/50">Learn & earn XP</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">{completedCount}/{modules.length}</p>
                <p className="text-xs text-white/40">Completed</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-2xl font-bold text-violet-400">{totalXP}</p>
                <p className="text-xs text-white/40">XP Earned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <FilterTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available' },
            { id: 'completed', label: 'Completed' },
          ]}
          activeFilter={filter}
          onFilterChange={setFilter}
          variant="cyan"
        />
      </div>

      {/* Modules List */}
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={3} height="h-28" />
        ) : filteredModules.length === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            title="No modules found"
            description="Check back later for new training"
          />
        ) : (
          <div className="space-y-3">
            {filteredModules.map(module => (
              <TrainingCard
                key={module.id}
                module={module}
                userProgress={userProgress[module.id]}
                onStart={handleStartModule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Training Modal */}
      {activeModule && (
        <TrainingDetail
          module={activeModule}
          onClose={() => setActiveModule(null)}
          onComplete={handleCompleteModule}
        />
      )}
    </div>
  );
}
