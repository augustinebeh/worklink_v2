import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  User,
  Clock,
  Phone,
  Mail,
  FileText,
  Presentation,
  TrendingUp,
  Star,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Trophy,
  MapPin,
  ClipboardList,
  ExternalLink
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import renewalService from '../shared/services/api/renewal.service';
import { clsx } from 'clsx';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Circular Progress Component for Probability
function ProbabilityGauge({ probability = 0, size = 120 }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (probability / 100) * circumference;

  const getColor = (prob) => {
    if (prob >= 70) return '#10b981'; // emerald-500
    if (prob >= 40) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={getColor(probability)}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{probability}%</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">renewal</span>
      </div>
    </div>
  );
}

// Activity Timeline Component
function ActivityTimeline({ activities = [], onAddActivity }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'meeting',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    outcome: ''
  });

  const activityIcons = {
    meeting: Presentation,
    call: Phone,
    email: Mail,
    proposal: FileText,
    follow_up: Clock,
    demo: TrendingUp
  };

  const activityColors = {
    meeting: 'text-blue-500 bg-blue-100',
    call: 'text-green-500 bg-green-100',
    email: 'text-purple-500 bg-purple-100',
    proposal: 'text-orange-500 bg-orange-100',
    follow_up: 'text-amber-500 bg-amber-100',
    demo: 'text-emerald-500 bg-emerald-100'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAddActivity(newActivity);
      setNewActivity({
        type: 'meeting',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        outcome: ''
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add activity:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Activity Timeline</h3>
        <Button size="sm" onClick={() => setShowAddModal(true)} icon={Plus}>
          Add Activity
        </Button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-6">
          {activities.map((activity, index) => {
            const IconComponent = activityIcons[activity.type] || FileText;
            return (
              <div key={activity.id || index} className="relative flex items-start gap-4">
                <div className={clsx(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900',
                  activityColors[activity.type] || 'text-slate-500 bg-slate-100'
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{activity.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{activity.description}</p>
                      {activity.outcome && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Outcome:</span> {activity.outcome}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end text-sm text-slate-400">
                      <span>{formatDate(activity.date)}</span>
                      <Badge variant="info" className="mt-1 capitalize">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activities recorded yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowAddModal(true)}
              >
                Add first activity
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Activity"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Activity Type
              </label>
              <select
                className="input"
                value={newActivity.type}
                onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}
                required
              >
                <option value="meeting">Meeting</option>
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="proposal">Proposal</option>
                <option value="follow_up">Follow-up</option>
                <option value="demo">Demo/Presentation</option>
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={newActivity.date}
              onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
              required
            />
          </div>

          <Input
            label="Activity Title"
            placeholder="e.g., Initial meeting with procurement team"
            value={newActivity.title}
            onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Details about the activity..."
            value={newActivity.description}
            onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
            rows={3}
          />

          <Textarea
            label="Outcome/Notes"
            placeholder="What was achieved? Next steps?"
            value={newActivity.outcome}
            onChange={(e) => setNewActivity({...newActivity, outcome: e.target.value})}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Activity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Action Items Checklist Component
function ActionChecklist({ actionItems = [], onUpdateItem, onAddItem }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
    priority: 'medium'
  });

  const handleToggleComplete = async (itemId, completed) => {
    try {
      await onUpdateItem(itemId, { completed });
    } catch (error) {
      console.error('Failed to update action item:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAddItem(newItem);
      setNewItem({
        title: '',
        description: '',
        due_date: '',
        assigned_to: '',
        priority: 'medium'
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add action item:', error);
    }
  };

  const priorityColors = {
    high: 'text-red-600 bg-red-100',
    medium: 'text-amber-600 bg-amber-100',
    low: 'text-green-600 bg-green-100'
  };

  const completedCount = actionItems.filter(item => item.completed).length;
  const completionPercent = actionItems.length ? Math.round((completedCount / actionItems.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Action Items</h3>
          <p className="text-sm text-slate-500">
            {completedCount} of {actionItems.length} completed ({completionPercent}%)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)} icon={Plus}>
          Add Item
        </Button>
      </div>

      {/* Progress bar */}
      {actionItems.length > 0 && (
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      )}

      <div className="space-y-3">
        {actionItems.map((item) => {
          const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.completed;

          return (
            <div
              key={item.id}
              className={clsx(
                'flex items-start gap-3 p-4 rounded-lg border',
                item.completed
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : isOverdue
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}
            >
              <button
                onClick={() => handleToggleComplete(item.id, !item.completed)}
                className={clsx(
                  'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  item.completed
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                )}
              >
                {item.completed && <CheckCircle className="h-3 w-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={clsx(
                      'font-medium',
                      item.completed
                        ? 'text-slate-500 line-through'
                        : 'text-slate-900 dark:text-white'
                    )}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      {item.due_date && (
                        <div className={clsx(
                          'flex items-center gap-1',
                          isOverdue && 'text-red-600'
                        )}>
                          <Calendar className="h-3 w-3" />
                          <span>Due {formatDate(item.due_date)}</span>
                          {isOverdue && <AlertTriangle className="h-3 w-3" />}
                        </div>
                      )}
                      {item.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{item.assigned_to}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={clsx('ml-3', priorityColors[item.priority])}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}

        {actionItems.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No action items yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowAddModal(true)}
            >
              Add first item
            </Button>
          </div>
        )}
      </div>

      {/* Add Action Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Action Item"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g., Prepare technical proposal"
            value={newItem.title}
            onChange={(e) => setNewItem({...newItem, title: e.target.value})}
            required
          />

          <Textarea
            label="Description"
            placeholder="Additional details..."
            value={newItem.description}
            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={newItem.due_date}
              onChange={(e) => setNewItem({...newItem, due_date: e.target.value})}
            />
            <Input
              label="Assigned To"
              placeholder="Person responsible"
              value={newItem.assigned_to}
              onChange={(e) => setNewItem({...newItem, assigned_to: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <select
              className="input"
              value={newItem.priority}
              onChange={(e) => setNewItem({...newItem, priority: e.target.value})}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Similar Tenders Carousel
function SimilarTendersCarousel({ similarTenders = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!similarTenders.length) return null;

  const nextTender = () => {
    setCurrentIndex((prev) => (prev + 1) % similarTenders.length);
  };

  const prevTender = () => {
    setCurrentIndex((prev) => (prev - 1 + similarTenders.length) % similarTenders.length);
  };

  const current = similarTenders[currentIndex];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-white">Similar Past Tenders</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={prevTender}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={similarTenders.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">
            {currentIndex + 1} of {similarTenders.length}
          </span>
          <button
            onClick={nextTender}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={similarTenders.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h5 className="font-medium text-slate-900 dark:text-white">{current.title}</h5>
            <p className="text-sm text-slate-500 mt-1">{current.agency}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>{formatCurrency(current.value)}</span>
              <span>{formatDate(current.award_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {current.won ? (
              <Badge variant="success">Won</Badge>
            ) : (
              <Badge variant="neutral">Lost</Badge>
            )}
            <Trophy className={clsx(
              'h-4 w-4',
              current.won ? 'text-emerald-500' : 'text-slate-400'
            )} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
      console.error('Error fetching renewal:', err);
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

  const engagementStatus = renewal.engagement_level || 'not_engaged';
  const statusColors = {
    not_engaged: 'text-red-600 bg-red-100',
    initial_contact: 'text-amber-600 bg-amber-100',
    active_discussion: 'text-blue-600 bg-blue-100',
    proposal_stage: 'text-purple-600 bg-purple-100',
    negotiation: 'text-emerald-600 bg-emerald-100'
  };

  const statusLabels = {
    not_engaged: 'Not Engaged',
    initial_contact: 'Initial Contact',
    active_discussion: 'Active Discussion',
    proposal_stage: 'Proposal Stage',
    negotiation: 'Negotiation'
  };

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/renewals')}
          icon={ArrowLeft}
        >
          Back to Renewals
        </Button>
        <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-600" />
        <nav className="text-sm text-slate-500">
          <Link to="/renewals" className="hover:text-slate-700">Renewals</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 dark:text-white">{renewal.agency_name}</span>
        </nav>
      </div>

      {/* Header Section */}
      <Card className="border-2 border-primary-100 dark:border-primary-800">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Main Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {renewal.agency_name}
                </h1>
                <h2 className="text-lg text-slate-600 dark:text-slate-400 mb-3">
                  {renewal.contract_description}
                </h2>
                <Badge className={clsx('mb-4', statusColors[engagementStatus])}>
                  {statusLabels[engagementStatus]}
                </Badge>
              </div>
              <Button variant="secondary" icon={Edit}>
                Edit Details
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSignIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contract Value</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(renewal.contract_value)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Contract End</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(renewal.contract_end_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expected RFP</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(renewal.expected_rfp_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">BD Manager</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {renewal.assigned_bd_manager || 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Probability Gauge */}
          <div className="flex flex-col items-center justify-center lg:min-w-[200px] bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
            <ProbabilityGauge probability={renewal.renewal_probability || 0} />
            <p className="text-sm text-slate-500 mt-3 text-center">
              Renewal Probability
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Intelligence Panel */}
        <div className="xl:col-span-2 space-y-6">
          {/* Original Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Contract Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Original Contract</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Start Date:</span>
                      <span>{formatDate(renewal.original_start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span>{renewal.contract_duration || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contract Type:</span>
                      <span>{renewal.contract_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Procurement Method:</span>
                      <span>{renewal.procurement_method || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-3">Incumbent Supplier</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Company:</span>
                      <span>{renewal.incumbent_supplier || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Performance:</span>
                      <span className="flex items-center gap-1">
                        {renewal.incumbent_performance || 'N/A'}
                        {renewal.incumbent_performance === 'Good' && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Issues:</span>
                      <span>{renewal.known_issues || 'None known'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Probability Reasoning */}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white mb-3">Renewal Probability Analysis</h4>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {renewal.probability_factors?.map((factor, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className={clsx(
                          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                          factor.positive ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                        <span className={factor.positive ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                          {factor.description}
                        </span>
                      </li>
                    )) || (
                      <li className="text-sm text-slate-500">No analysis factors available</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Historical Performance */}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white mb-3">Historical Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-2xl font-bold text-blue-600">{renewal.agency_win_rate || 0}%</div>
                    <div className="text-xs text-slate-500">Win Rate (This Agency)</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="text-2xl font-bold text-emerald-600">{renewal.past_tenders || 0}</div>
                    <div className="text-xs text-slate-500">Past Tenders</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <div className="text-2xl font-bold text-amber-600">{renewal.avg_win_margin || 0}%</div>
                    <div className="text-xs text-slate-500">Avg Win Margin</div>
                  </div>
                </div>
              </div>

              {/* Similar Tenders */}
              <SimilarTendersCarousel similarTenders={renewal.similar_tenders || []} />
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardContent>
              <ActivityTimeline
                activities={activities}
                onAddActivity={handleAddActivity}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Action Items */}
        <div className="space-y-6">
          <Card>
            <CardContent>
              <ActionChecklist
                actionItems={actionItems}
                onUpdateItem={handleUpdateActionItem}
                onAddItem={handleAddActionItem}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}