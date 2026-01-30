import { useState, useEffect } from 'react';
import { 
  BotIcon, 
  RefreshCwIcon, 
  PlayIcon,
  ZapIcon,
  UsersIcon,
  SearchIcon,
  SendIcon,
  ClipboardCopyIcon,
  CheckIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  SparklesIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  TargetIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { clsx } from 'clsx';

function StatCard({ title, value, subtitle, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

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
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-emerald-500" />
      ) : (
        <ClipboardCopyIcon className="h-4 w-4 text-slate-400" />
      )}
    </button>
  );
}

export default function AIAutomation() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gebiz');
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatedPostings, setGeneratedPostings] = useState(null);
  const [outreachMessages, setOutreachMessages] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  // Job posting form
  const [postingForm, setPostingForm] = useState({
    jobTitle: 'Banquet Server',
    payRate: '15',
    location: 'Marina Bay Sands',
    requirements: '• Singaporean/PR\n• Age 18+\n• Smart appearance',
    slots: '10',
  });

  useEffect(() => {
    fetchStats();
    fetchJobs();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/ai/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/v1/jobs?status=open&limit=20');
      const data = await res.json();
      if (data.success) setJobs(data.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const runGebizScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch('/api/v1/ai/gebiz/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: ['manpower', 'hr services', 'event support'] }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully scraped! Found ${data.data.newInserted} new tenders.`);
        fetchStats();
      }
    } catch (error) {
      alert('Scraping failed: ' + error.message);
    } finally {
      setScraping(false);
    }
  };

  const analyzeAllTenders = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/v1/ai/tenders/analyze-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Analyzed ${data.data.length} tenders!`);
        fetchStats();
      }
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generatePostings = async () => {
    try {
      const res = await fetch('/api/v1/ai/sourcing/generate-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postingForm),
      });
      const data = await res.json();
      if (data.success) setGeneratedPostings(data.data);
    } catch (error) {
      alert('Generation failed: ' + error.message);
    }
  };

  const generateOutreach = async (jobId) => {
    try {
      const res = await fetch('/api/v1/ai/sourcing/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.success) setOutreachMessages(data.data);
    } catch (error) {
      alert('Generation failed: ' + error.message);
    }
  };

  const fetchRecommendations = async (jobId) => {
    try {
      const res = await fetch(`/api/v1/ai/sourcing/recommend/${jobId}`);
      const data = await res.json();
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
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <BotIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Automation</h1>
              <p className="text-slate-500 dark:text-slate-400">GeBIZ scraping, tender analysis & candidate sourcing</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={fetchStats}>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="GeBIZ Tenders" 
            value={stats.tenders.totalScraped} 
            subtitle={`${stats.tenders.pendingAnalysis} pending analysis`}
            icon={SearchIcon} 
            color="primary" 
          />
          <StatCard 
            title="High Priority" 
            value={stats.tenders.highPriority} 
            subtitle="Win probability ≥60%"
            icon={TargetIcon} 
            color="success" 
          />
          <StatCard 
            title="Active Candidates" 
            value={stats.candidates.totalActive} 
            subtitle={`${stats.candidates.topPerformers} top performers`}
            icon={UsersIcon} 
            color="info" 
          />
          <StatCard 
            title="Unfilled Slots" 
            value={stats.jobs.unfilledSlots} 
            subtitle={`${stats.jobs.openJobs} open jobs`}
            icon={AlertCircleIcon} 
            color="warning" 
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'gebiz', label: 'GeBIZ Scraper', icon: SearchIcon },
          { id: 'sourcing', label: 'Job Posting Generator', icon: MessageSquareIcon },
          { id: 'outreach', label: 'Candidate Outreach', icon: SendIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* GeBIZ Scraper Tab */}
      {activeTab === 'gebiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SearchIcon className="h-5 w-5" />
                GeBIZ Tender Scraper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Automatically scrape GeBIZ for new manpower and HR services tenders.
                The AI will analyze and prioritize opportunities based on your win history.
              </p>
              
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Search Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {['Manpower Supply', 'HR Services', 'Event Support', 'Admin Support'].map((cat) => (
                    <Badge key={cat} variant="info">{cat}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={runGebizScrape} 
                  loading={scraping}
                  icon={PlayIcon}
                  className="flex-1"
                >
                  {scraping ? 'Scraping...' : 'Run Scraper Now'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                AI Tender Analyzer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                AI analyzes tenders based on your company profile, past wins, candidate pool, 
                and market conditions to predict win probability.
              </p>

              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Analysis Factors</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Contract size vs. your capacity</li>
                  <li>• Category match to your track record</li>
                  <li>• Time pressure (short deadlines = less competition)</li>
                  <li>• Margin assessment</li>
                  <li>• Headcount vs. available candidates</li>
                </ul>
              </div>

              <Button 
                onClick={analyzeAllTenders} 
                loading={analyzing}
                icon={ZapIcon}
                variant="secondary"
                className="w-full"
              >
                {analyzing ? 'Analyzing...' : 'Analyze All New Tenders'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job Posting Generator Tab */}
      {activeTab === 'sourcing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Job Postings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  rows={3}
                  value={postingForm.requirements}
                  onChange={(e) => setPostingForm({...postingForm, requirements: e.target.value})}
                />
              </div>
              <Button onClick={generatePostings} icon={SparklesIcon} className="w-full">
                Generate All Platforms
              </Button>
            </CardContent>
          </Card>

          {generatedPostings && (
            <div className="space-y-4">
              {Object.entries(generatedPostings).map(([platform, content]) => (
                <Card key={platform}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize">{platform}</CardTitle>
                      <CopyButton text={typeof content === 'string' ? content : content.caption || JSON.stringify(content)} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
                      {typeof content === 'string' ? content : content.caption || JSON.stringify(content, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Outreach Tab */}
      {activeTab === 'outreach' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
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
                      ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.job_date} • ${job.pay_rate}/hr</p>
                  <p className="text-xs text-slate-400">{job.total_slots - job.filled_slots} slots open</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>AI Recommended Candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {recommendations?.recommendations?.map((cand) => (
                <div key={cand.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{cand.name}</p>
                    <Badge variant={cand.matchScore >= 70 ? 'success' : cand.matchScore >= 50 ? 'warning' : 'neutral'}>
                      {cand.matchScore}% match
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Level {cand.level} • {cand.total_jobs_completed} jobs • ⭐ {cand.rating || 'New'}
                  </p>
                </div>
              )) || (
                <p className="text-sm text-slate-400 text-center py-8">
                  Select a job to see AI recommendations
                </p>
              )}
            </CardContent>
          </Card>

          {/* Generate Outreach */}
          <Card>
            <CardHeader>
              <CardTitle>Mass Outreach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedJob ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Generate personalized WhatsApp messages for top candidates for:
                  </p>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="font-medium text-slate-900 dark:text-white">{selectedJob.title}</p>
                    <p className="text-xs text-slate-500">{selectedJob.job_date}</p>
                  </div>
                  <Button 
                    onClick={() => generateOutreach(selectedJob.id)} 
                    icon={SendIcon}
                    className="w-full"
                  >
                    Generate Messages
                  </Button>

                  {outreachMessages && (
                    <div className="space-y-3 mt-4">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Generated for {outreachMessages.totalCandidates} candidates:
                      </p>
                      {outreachMessages.messages?.slice(0, 5).map((msg) => (
                        <div key={msg.candidateId} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm text-slate-900 dark:text-white">{msg.candidateName}</p>
                            <CopyButton text={msg.message} />
                          </div>
                          <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
                            {msg.message}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">
                  Select a job from the left panel
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
