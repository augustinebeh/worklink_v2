import { useState, useEffect } from 'react';
import {
  BotIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  FileTextIcon,
  MessageSquareIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import AutomationDashboard from '../components/ai/AutomationDashboard';
import AutomationRules from '../components/ai/AutomationRules';
import { clsx } from 'clsx';

export default function AIAutomation() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scraper');
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recentTenders, setRecentTenders] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecentTenders();
    checkAiStatus();
  }, []);

  const checkAiStatus = async () => {
    try {
      const res = await fetch('/api/v1/ai/ai-status');
      const data = await res.json();
      if (data.success) setAiStatus(data.data);
    } catch (error) {
      // AI status check failed
    }
  };

  const askAI = async () => {
    if (!chatQuestion.trim()) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const res = await fetch('/api/v1/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatQuestion, context: 'tenders' }),
      });
      const data = await res.json();
      if (data.success) setChatResponse(data.data.answer);
      else setChatResponse('Error: ' + data.error);
    } catch (error) {
      setChatResponse('Failed to get response: ' + error.message);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/ai/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      // Failed to fetch stats
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTenders = async () => {
    try {
      const res = await fetch('/api/v1/tenders?limit=10&sort=created_at:desc');
      const data = await res.json();
      if (data.success) setRecentTenders(data.data || []);
    } catch (error) {
      // Failed to fetch tenders
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
        fetchStats();
        fetchRecentTenders();
      }
    } catch (error) {
      // Scraping failed
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
        fetchStats();
        fetchRecentTenders();
      }
    } catch (error) {
      // Analysis failed
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <BotIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tender AI Tools</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                  BPO
                </span>
                {aiStatus?.enabled && (
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-semibold rounded flex items-center gap-1',
                    aiStatus.status === 'connected'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  )}>
                    <SparklesIcon className="h-3 w-3" />
                    Claude AI {aiStatus.status === 'connected' ? 'Ready' : 'Error'}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400">GeBIZ scraping & tender analysis</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={() => { fetchStats(); fetchRecentTenders(); }}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'scraper', label: 'GeBIZ Scraper', icon: SearchIcon },
          { id: 'analyzer', label: 'AI Analyzer', icon: SparklesIcon },
          { id: 'recent', label: 'Recent Tenders', icon: FileTextIcon },
          { id: 'assistant', label: 'AI Assistant', icon: MessageSquareIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scraper & Analyzer Tabs */}
      {(activeTab === 'scraper' || activeTab === 'analyzer') && (
        <AutomationDashboard
          activeTab={activeTab}
          stats={stats}
          scraping={scraping}
          analyzing={analyzing}
          onRunScrape={runGebizScrape}
          onAnalyzeAll={analyzeAllTenders}
        />
      )}

      {/* Recent Tenders & AI Assistant Tabs */}
      {(activeTab === 'recent' || activeTab === 'assistant') && (
        <AutomationRules
          activeTab={activeTab}
          recentTenders={recentTenders}
          chatQuestion={chatQuestion}
          setChatQuestion={setChatQuestion}
          chatResponse={chatResponse}
          chatLoading={chatLoading}
          aiStatus={aiStatus}
          onAskAI={askAI}
        />
      )}
    </div>
  );
}
