import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import RenewalHeader from '../components/renewal/RenewalHeader';
import RenewalInfo from '../components/renewal/RenewalInfo';
import RenewalEngagement from '../components/renewal/RenewalEngagement';
import RenewalHistory from '../components/renewal/RenewalHistory';
import renewalService from '../shared/services/api/renewal.service';

export default function RenewalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [renewal, setRenewal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    fetchRenewalData();
  }, [id]);

  const fetchRenewalData = async () => {
    try {
      setLoading(true);
      const response = await renewalService.getRenewalById(id);

      if (response.success) {
        setRenewal(response.data.renewal);
        setActivities(response.data.activities || []);
        setActionItems(response.data.actionItems || []);
      } else {
        setError('Failed to load renewal details');
      }
    } catch (err) {
      setError('Failed to load renewal details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (activity) => {
    const response = await renewalService.logActivity(id, activity);
    if (response.success) {
      setActivities(prev => [response.data, ...prev]);
    }
  };

  const handleAddActionItem = async (item) => {
    // This would be implemented when the backend endpoint is ready
    const newItem = { ...item, id: Date.now(), completed: false };
    setActionItems(prev => [...prev, newItem]);
  };

  const handleUpdateActionItem = async (itemId, updates) => {
    setActionItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Error</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <Button onClick={() => navigate('/renewals')}>
            Back to Renewals
          </Button>
        </div>
      </div>
    );
  }

  if (!renewal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Renewal not found</h2>
          <Button onClick={() => navigate('/renewals')}>
            Back to Renewals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RenewalHeader renewal={renewal} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Intelligence & History */}
        <div className="xl:col-span-2 space-y-6">
          <RenewalInfo renewal={renewal} />
          <RenewalHistory
            activities={activities}
            onAddActivity={handleAddActivity}
          />
        </div>

        {/* Right Column - Engagement / Action Items */}
        <div className="space-y-6">
          <RenewalEngagement
            actionItems={actionItems}
            onUpdateItem={handleUpdateActionItem}
            onAddItem={handleAddActionItem}
          />
        </div>
      </div>
    </div>
  );
}
