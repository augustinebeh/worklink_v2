import { useState, useEffect } from 'react';
import { 
  DatabaseIcon, 
  RefreshCwIcon, 
  AlertTriangleIcon,
  CheckCircleIcon,
  ServerIcon,
  HardDriveIcon,
  UsersIcon,
  BriefcaseIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal, { ModalFooter } from '../components/ui/Modal';

export default function Settings() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/v1/admin/reset-to-sample', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess(true);
        await fetchStats();
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to reset database:', error);
    } finally {
      setResetting(false);
    }
  };

  const statItems = stats ? [
    { label: 'Candidates', value: stats.candidates, icon: UsersIcon },
    { label: 'Jobs', value: stats.jobs, icon: BriefcaseIcon },
    { label: 'Deployments', value: stats.deployments, icon: ServerIcon },
    { label: 'Payments', value: stats.payments, icon: HardDriveIcon },
    { label: 'Clients', value: stats.clients, icon: UsersIcon },
    { label: 'Tenders', value: stats.tenders, icon: BriefcaseIcon },
    { label: 'Training Courses', value: stats.training, icon: DatabaseIcon },
    { label: 'Achievements', value: stats.achievements, icon: CheckCircleIcon },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          System configuration and database management
        </p>
      </div>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Database Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statItems.map((item) => (
                <div key={item.label} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Development Tools */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangleIcon className="h-5 w-5" />
            Development Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                Reset to Sample Data
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                This will delete all existing data and restore the database to its initial sample state. 
                Use this for testing and development purposes only.
              </p>
              <Button 
                variant="danger" 
                icon={RefreshCwIcon}
                onClick={() => setShowResetModal(true)}
              >
                Reset Database
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">
                API Endpoints
              </h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-mono">
                <p>GET /api/v1/candidates</p>
                <p>GET /api/v1/jobs</p>
                <p>GET /api/v1/deployments</p>
                <p>GET /api/v1/payments</p>
                <p>GET /api/v1/clients</p>
                <p>GET /api/v1/tenders</p>
                <p>GET /api/v1/analytics/dashboard</p>
                <p>GET /api/v1/gamification/leaderboard</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => !resetting && setShowResetModal(false)}
        title="Reset Database"
        description="Are you sure you want to reset the database to sample data?"
      >
        {resetSuccess ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              Database Reset Successful!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Sample data has been restored.
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> This action cannot be undone. All existing data will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowResetModal(false)} disabled={resetting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleResetDatabase} loading={resetting}>
                {resetting ? 'Resetting...' : 'Yes, Reset Database'}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
