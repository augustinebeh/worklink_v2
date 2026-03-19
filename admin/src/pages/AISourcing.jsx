import { useState, useEffect } from 'react';
import {
  SearchIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon,
  MessageSquareIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Button from '../components/ui/Button';
import SourcingControls from '../components/ai/SourcingControls';
import SourcingResults from '../components/ai/SourcingResults';
import { clsx } from 'clsx';

export default function AISourcing() {
  const [activeTab, setActiveTab] = useState('posting');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [generatedPostings, setGeneratedPostings] = useState(null);
  const [outreachMessages, setOutreachMessages] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  // Job posting form
  const [postingForm, setPostingForm] = useState({
    jobTitle: 'Banquet Server',
    payRate: '15',
    location: 'Marina Bay Sands',
    requirements: '• Singaporean/PR\n• Age 18+\n• Smart appearance',
    slots: '10',
  });

  useEffect(() => {
    fetchJobs();
    checkAiStatus();
  }, []);

  const checkAiStatus = async () => {
    try {
      // TODO: Create aiService - using raw client for now
      const data = await api.client.get('/ai/ai-status');
      if (data.success) setAiStatus(data.data);
    } catch (error) {
      // AI status check failed silently
    }
  };

  const fetchJobs = async () => {
    try {
      const data = await api.jobs.getAll({
        status: 'open',
        limit: 20
      });
      if (data.success) setJobs(data.data);
    } catch (error) {
      // Failed to fetch jobs
    }
  };

  const generatePostings = async () => {
    setLoading(true);
    try {
      // TODO: Create aiService - using raw client for now
      const data = await api.client.post('/ai/sourcing/generate-posting', postingForm);
      if (data.success) setGeneratedPostings(data.data);
    } catch (error) {
      // Generation failed - UI already shows no results
    } finally {
      setLoading(false);
    }
  };

  const generateOutreach = async (jobId) => {
    setLoading(true);
    try {
      // TODO: Create aiService - using raw client for now
      const data = await api.client.post('/ai/sourcing/generate-outreach', { jobId });
      if (data.success) setOutreachMessages(data.data);
    } catch (error) {
      // Generation failed - UI already shows no results
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (jobId) => {
    try {
      // TODO: Create aiService - using raw client for now
      const data = await api.client.get(`/ai/sourcing/recommend/${jobId}`);
      if (data.success) setRecommendations(data.data);
    } catch (error) {
      // Failed to fetch recommendations
    }
  };

  const handleSelectJobForOutreach = (job) => {
    setSelectedJob(job);
    fetchRecommendations(job.id);
    setOutreachMessages(null);
  };

  const handleSelectJobForRecommend = (job) => {
    setSelectedJob(job);
    fetchRecommendations(job.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <SearchIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sourcing AI</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                  HR
                </span>
                {aiStatus?.enabled && (
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-semibold rounded flex items-center gap-1',
                    aiStatus.status === 'connected'
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  )}>
                    <SparklesIcon className="h-3 w-3" />
                    Claude AI {aiStatus.status === 'connected' ? 'Ready' : 'Error'}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400">Job posting templates & candidate outreach</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={fetchJobs}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'posting', label: 'Job Posting Generator', icon: MessageSquareIcon },
          { id: 'outreach', label: 'Candidate Outreach', icon: SendIcon },
          { id: 'recommend', label: 'AI Recommendations', icon: UsersIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Job Posting Generator Tab */}
      {activeTab === 'posting' && (
        <SourcingControls
          postingForm={postingForm}
          setPostingForm={setPostingForm}
          generatedPostings={generatedPostings}
          loading={loading}
          onGenerate={generatePostings}
        />
      )}

      {/* Candidate Outreach & AI Recommendations Tabs */}
      {(activeTab === 'outreach' || activeTab === 'recommend') && (
        <SourcingResults
          activeTab={activeTab}
          jobs={jobs}
          selectedJob={selectedJob}
          outreachMessages={outreachMessages}
          recommendations={recommendations}
          loading={loading}
          onSelectJobForOutreach={handleSelectJobForOutreach}
          onSelectJobForRecommend={handleSelectJobForRecommend}
          onGenerateOutreach={generateOutreach}
        />
      )}
    </div>
  );
}
