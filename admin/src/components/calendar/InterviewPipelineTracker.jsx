import React, { useState, useEffect } from 'react';
import { Users, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle, Filter, Search } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';

const PIPELINE_STAGES = [
  { id: 'in_queue', label: 'In Queue', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200' },
  { id: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200' },
  { id: 'no_show', label: 'No Show', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' }
];

const InterviewPipelineTracker = ({
  onCandidateSelect,
  className = ''
}) => {
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortBy, setSortBy] = useState('scheduled_datetime');

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setLoading(true);

      // Mock pipeline data for frontend development
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockPipelineData = [
        {
          id: 'candidate-1',
          candidate_name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          role: 'Senior Frontend Developer',
          stage: 'scheduled',
          scheduled_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Strong React background',
          interviewer: 'John Smith',
          interview_type: 'video'
        },
        {
          id: 'candidate-2',
          candidate_name: 'Mike Chen',
          email: 'mike.chen@email.com',
          role: 'Backend Engineer',
          stage: 'confirmed',
          scheduled_datetime: new Date().toISOString(), // Today
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Python expert, 5 years experience',
          interviewer: 'Admin User',
          interview_type: 'phone'
        },
        {
          id: 'candidate-3',
          candidate_name: 'Emily Rodriguez',
          email: 'emily.rodriguez@email.com',
          role: 'Full Stack Developer',
          stage: 'contacted',
          scheduled_datetime: null,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Available for interview this week',
          interviewer: null,
          interview_type: null
        },
        {
          id: 'candidate-4',
          candidate_name: 'David Kim',
          email: 'david.kim@email.com',
          role: 'DevOps Engineer',
          stage: 'in_queue',
          scheduled_datetime: null,
          created_at: new Date().toISOString(),
          notes: 'New application',
          interviewer: null,
          interview_type: null
        },
        {
          id: 'candidate-5',
          candidate_name: 'Anna Kowalski',
          email: 'anna.kowalski@email.com',
          role: 'UX Designer',
          stage: 'completed',
          scheduled_datetime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Interview completed, pending review',
          interviewer: 'Jane Doe',
          interview_type: 'video'
        }
      ];

      setPipelineData(mockPipelineData);
      console.log('Pipeline data loaded (frontend-only):', mockPipelineData);
    } catch (err) {
      setError('Failed to fetch pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const getDateDisplayText = (date) => {
    const dateObj = new Date(date);
    if (isToday(dateObj)) return 'Today';
    if (isTomorrow(dateObj)) return 'Tomorrow';
    if (isYesterday(dateObj)) return 'Yesterday';
    return format(dateObj, 'MMM dd');
  };

  const getStageConfig = (stage) => {
    return PIPELINE_STAGES.find(s => s.id === stage) || PIPELINE_STAGES[0];
  };

  const getUrgencyLevel = (candidate) => {
    if (!candidate.scheduled_datetime) return 'low';

    const scheduledDate = new Date(candidate.scheduled_datetime);
    const now = new Date();
    const hoursUntil = (scheduledDate - now) / (1000 * 60 * 60);

    if (hoursUntil < 2) return 'critical';
    if (hoursUntil < 24) return 'high';
    if (hoursUntil < 72) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const filteredAndSortedData = pipelineData
    .filter(candidate => {
      const matchesSearch = !searchTerm ||
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStage = selectedStage === 'all' || candidate.stage === selectedStage;

      return matchesSearch && matchesStage;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'scheduled_datetime':
          if (!a.scheduled_datetime && !b.scheduled_datetime) return 0;
          if (!a.scheduled_datetime) return 1;
          if (!b.scheduled_datetime) return -1;
          return new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'urgency':
          const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return urgencyOrder[getUrgencyLevel(a)] - urgencyOrder[getUrgencyLevel(b)];
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchPipelineData}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Interview Pipeline
          </h3>
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">
            {filteredAndSortedData.length}
          </span>
        </div>

        <button
          onClick={fetchPipelineData}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="scheduled_datetime">Date Scheduled</option>
            <option value="name">Name</option>
            <option value="urgency">Urgency</option>
          </select>
        </div>
      </div>

      {/* Pipeline List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {filteredAndSortedData.length > 0 ? (
          filteredAndSortedData.map(candidate => {
            const stageConfig = getStageConfig(candidate.stage);
            const urgencyLevel = getUrgencyLevel(candidate);
            const urgencyColor = getUrgencyColor(urgencyLevel);

            return (
              <div
                key={candidate.id}
                onClick={() => onCandidateSelect?.(candidate)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {candidate.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageConfig.color}`}>
                        {stageConfig.label}
                      </span>
                      {urgencyLevel === 'critical' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                      {candidate.email}
                    </p>

                    {candidate.scheduled_datetime && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {getDateDisplayText(candidate.scheduled_datetime)} at{' '}
                            {format(new Date(candidate.scheduled_datetime), 'h:mm a')}
                          </span>
                        </div>
                        {candidate.interview_type && (
                          <span className="capitalize">{candidate.interview_type}</span>
                        )}
                      </div>
                    )}

                    {candidate.queue_status && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Queue Status: {candidate.queue_status}
                        {candidate.added_at && (
                          <span className="ml-2">
                            (added {format(new Date(candidate.added_at), 'MMM dd')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {urgencyLevel !== 'low' && (
                      <span className={`text-xs font-medium ${urgencyColor} uppercase tracking-wide`}>
                        {urgencyLevel}
                      </span>
                    )}

                    {candidate.conversion_stage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Stage: {candidate.conversion_stage}
                      </span>
                    )}

                    <ArrowRight className="w-4 h-4 text-gray-400 mt-1" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || selectedStage !== 'all'
                ? 'No candidates match your filters'
                : 'No candidates in pipeline'
              }
            </p>
          </div>
        )}
      </div>

      {/* Pipeline Summary */}
      {filteredAndSortedData.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {filteredAndSortedData.length} candidates in pipeline
            </span>
            <div className="flex gap-4">
              <span className="text-yellow-600 dark:text-yellow-400">
                {filteredAndSortedData.filter(c => getUrgencyLevel(c) === 'critical').length} critical
              </span>
              <span className="text-orange-600 dark:text-orange-400">
                {filteredAndSortedData.filter(c => getUrgencyLevel(c) === 'high').length} high priority
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPipelineTracker;