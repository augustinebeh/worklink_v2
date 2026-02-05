import { useState, useEffect } from 'react';
import {
  SearchIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon,
  ClipboardCopyIcon,
  CheckIcon,
  MessageSquareIcon,
  BriefcaseIcon,
  RefreshCwIcon,
  Loader2Icon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { clsx } from 'clsx';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-emerald-500" />
      ) : (
        <ClipboardCopyIcon className="h-4 w-4 text-slate-400" />
      )}
    </button>
  );
}

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
      console.error('Failed to check AI status:', error);
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
      console.error('Failed to fetch jobs:', error);
    }
  };

  const generatePostings = async () => {
    setLoading(true);
    try {
      // TODO: Create aiService - using raw client for now
      const data = await api.client.post('/ai/sourcing/generate-posting', postingForm);
      if (data.success) setGeneratedPostings(data.data);
    } catch (error) {
      alert('Generation failed: ' + error.message);
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
      alert('Generation failed: ' + error.message);
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
      console.error('Failed to fetch recommendations:', error);
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-emerald-500" />
                Generate Job Postings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Generate optimized job postings for multiple platforms with a single click.
              </p>

              <Input
                label="Job Title"
                value={postingForm.jobTitle}
                onChange={(e) => setPostingForm({...postingForm, jobTitle: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Pay Rate ($/hr)"
                  value={postingForm.payRate}
                  onChange={(e) => setPostingForm({...postingForm, payRate: e.target.value})}
                />
                <Input
                  label="Slots Needed"
                  value={postingForm.slots}
                  onChange={(e) => setPostingForm({...postingForm, slots: e.target.value})}
                />
              </div>
              <Input
                label="Location"
                value={postingForm.location}
                onChange={(e) => setPostingForm({...postingForm, location: e.target.value})}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Requirements
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[100px]"
                  value={postingForm.requirements}
                  onChange={(e) => setPostingForm({...postingForm, requirements: e.target.value})}
                />
              </div>
              <Button onClick={generatePostings} loading={loading} icon={SparklesIcon} className="w-full">
                Generate All Platforms
              </Button>
            </CardContent>
          </Card>

          {generatedPostings ? (
            <div className="space-y-4">
              {Object.entries(generatedPostings).map(([platform, content]) => (
                <Card key={platform}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize flex items-center gap-2">
                        {platform === 'whatsapp' && '📱'}
                        {platform === 'facebook' && '📘'}
                        {platform === 'instagram' && '📷'}
                        {platform === 'telegram' && '✈️'}
                        {platform}
                      </CardTitle>
                      <CopyButton text={typeof content === 'string' ? content : content.caption || JSON.stringify(content)} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                      {typeof content === 'string' ? content : content.caption || JSON.stringify(content, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <MessageSquareIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">No Postings Generated Yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Fill in the job details and click "Generate All Platforms" to create optimized postings for WhatsApp, Facebook, Instagram, and Telegram.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Candidate Outreach Tab */}
      {activeTab === 'outreach' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5" />
                Select Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {jobs.length > 0 ? jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    fetchRecommendations(job.id);
                    setOutreachMessages(null);
                  }}
                  className={clsx(
                    'p-3 rounded-lg cursor-pointer transition-colors',
                    selectedJob?.id === job.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{job.job_date} • ${job.pay_rate}/hr</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={job.total_slots - job.filled_slots > 0 ? 'success' : 'neutral'} size="sm">
                      {job.total_slots - job.filled_slots} slots open
                    </Badge>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-400 text-center py-8">No open jobs found</p>
              )}
            </CardContent>
          </Card>

          {/* Generate Outreach */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SendIcon className="h-5 w-5 text-emerald-500" />
                Mass WhatsApp Outreach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedJob ? (
                <>
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="font-medium text-slate-900 dark:text-white">{selectedJob.title}</p>
                    <p className="text-sm text-slate-500">{selectedJob.job_date} at {selectedJob.location}</p>
                    <p className="text-sm text-slate-500">${selectedJob.pay_rate}/hr • {selectedJob.total_slots - selectedJob.filled_slots} slots available</p>
                  </div>

                  <Button
                    onClick={() => generateOutreach(selectedJob.id)}
                    loading={loading}
                    icon={SparklesIcon}
                    className="w-full"
                  >
                    Generate Personalized Messages
                  </Button>

                  {outreachMessages && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Generated for {outreachMessages.totalCandidates} candidates
                        </p>
                        <Badge variant="success">{outreachMessages.messages?.length || 0} messages</Badge>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {outreachMessages.messages?.map((msg) => (
                          <div key={msg.candidateId} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm text-slate-900 dark:text-white">{msg.candidateName}</p>
                                <p className="text-xs text-slate-500">{msg.phone}</p>
                              </div>
                              <CopyButton text={msg.message} />
                            </div>
                            <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                              {msg.message}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <BriefcaseIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">Select a Job</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Choose a job from the left panel to generate personalized outreach messages.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Recommendations Tab */}
      {activeTab === 'recommend' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5" />
                Select Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    fetchRecommendations(job.id);
                  }}
                  className={clsx(
                    'p-3 rounded-lg cursor-pointer transition-colors',
                    selectedJob?.id === job.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.job_date} • ${job.pay_rate}/hr</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={job.total_slots - job.filled_slots > 0 ? 'success' : 'neutral'} size="sm">
                      {job.total_slots - job.filled_slots} slots open
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enhanced Recommendations */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-emerald-500" />
                  Enhanced AI Recommendations
                </CardTitle>
                {recommendations && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {recommendations.aiEnhanced && (
                      <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded">
                        AI Enhanced
                      </span>
                    )}
                    <span>{recommendations.qualifiedCandidates} qualified candidates</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recommendations?.recommendations?.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{recommendations.totalCandidates}</p>
                      <p className="text-xs text-slate-500">Total Candidates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{recommendations.averageScore}%</p>
                      <p className="text-xs text-slate-500">Average Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{recommendations.recommendations.length}</p>
                      <p className="text-xs text-slate-500">Top Matches</p>
                    </div>
                  </div>

                  {/* Candidate List */}
                  <div className="space-y-3">
                    {recommendations.recommendations.map((cand, index) => (
                      <div key={cand.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center relative">
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {cand.name?.charAt(0) || '?'}
                              </span>
                              <span className="absolute -top-1 -right-1 bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-800 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900 dark:text-white">{cand.name}</p>
                                {cand.keyStrengths && cand.keyStrengths.length > 0 && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                    ⭐ {cand.keyStrengths.length} strengths
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mb-2">
                                Level {cand.level} • {cand.total_jobs_completed} jobs completed •
                                {cand.rating ? ` ⭐ ${cand.rating}/5` : ' New worker'}
                                {cand.confidence && (
                                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                                    {Math.round(cand.confidence * 100)}% confidence
                                  </span>
                                )}
                              </p>

                              {/* Match Reason */}
                              {cand.matchReason && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                  {cand.matchReason}
                                </p>
                              )}

                              {/* Key Strengths */}
                              {cand.keyStrengths && cand.keyStrengths.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {cand.keyStrengths.map((strength, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                                      {strength}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Match Breakdown */}
                              {cand.breakdown && (
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
                                    <p className="font-medium">{Math.round(cand.breakdown.experience || 0)}</p>
                                    <p className="text-slate-500">Experience</p>
                                  </div>
                                  <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
                                    <p className="font-medium">{Math.round(cand.breakdown.skills || 0)}</p>
                                    <p className="text-slate-500">Skills</p>
                                  </div>
                                  <div className="text-center p-2 bg-white dark:bg-slate-700 rounded">
                                    <p className="font-medium">{Math.round(cand.breakdown.availability || 0)}</p>
                                    <p className="text-slate-500">Availability</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={cand.matchScore >= 80 ? 'success' : cand.matchScore >= 60 ? 'warning' : 'neutral'}>
                              {cand.matchScore}% match
                            </Badge>
                            <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                              Send Invite
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <UsersIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 dark:text-white mb-2">
                    {selectedJob ? 'No Recommendations' : 'Select a Job'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedJob
                      ? 'No matching candidates found for this job. Try adjusting the criteria.'
                      : 'Choose a job to see enhanced AI-powered candidate recommendations with detailed matching insights.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
