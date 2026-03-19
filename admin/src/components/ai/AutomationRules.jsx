import {
  SparklesIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MessageSquareIcon,
  SendIcon,
  Loader2Icon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

function RecentTendersPanel({ recentTenders }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="h-5 w-5" />
          Recently Scraped Tenders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentTenders.length > 0 ? (
          <div className="space-y-3">
            {recentTenders.map((tender) => (
              <div
                key={tender.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">
                      {tender.title}
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">{tender.agency}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={tender.win_probability >= 60 ? 'success' : tender.win_probability >= 30 ? 'warning' : 'neutral'}>
                        {tender.win_probability || 0}% win prob
                      </Badge>
                      <span className="text-xs text-slate-400">
                        Closes: {tender.closing_date || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={tender.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLinkIcon className="h-4 w-4 text-slate-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <FileTextIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-2">No Tenders Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Run the GeBIZ scraper to fetch the latest tenders matching your business categories.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIAssistantPanel({
  chatQuestion,
  setChatQuestion,
  chatResponse,
  chatLoading,
  aiStatus,
  onAskAI,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5 text-amber-500" />
            Ask Claude AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ask questions about tender strategy, bidding advice, pricing, or any BPO-related queries.
          </p>

          <div className="space-y-3">
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[120px] focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., What's a good pricing strategy for a 10-person admin support tender?"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) onAskAI();
              }}
            />
            <Button
              onClick={onAskAI}
              loading={chatLoading}
              loadingText="Thinking..."
              icon={SendIcon}
              className="w-full"
              disabled={!chatQuestion.trim() || !aiStatus?.enabled}
            >
              Ask Claude
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">Example Questions</h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li className="cursor-pointer hover:text-amber-600" onClick={() => setChatQuestion("What factors should I consider when bidding for a government manpower tender?")}>
                • What factors should I consider when bidding for a government manpower tender?
              </li>
              <li className="cursor-pointer hover:text-amber-600" onClick={() => setChatQuestion("How do I calculate a competitive charge rate for admin support staff?")}>
                • How do I calculate a competitive charge rate for admin support staff?
              </li>
              <li className="cursor-pointer hover:text-amber-600" onClick={() => setChatQuestion("What are common reasons for losing GeBIZ tenders?")}>
                • What are common reasons for losing GeBIZ tenders?
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-amber-500" />
            AI Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chatLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2Icon className="h-8 w-8 text-amber-500 animate-spin mb-4" />
              <p className="text-sm text-slate-500">Claude is thinking...</p>
            </div>
          ) : chatResponse ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{chatResponse}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <MessageSquareIcon className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">Ask a Question</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                {aiStatus?.enabled
                  ? 'Type your question and Claude AI will provide strategic advice for your tender decisions.'
                  : 'Claude AI is not configured. Add ANTHROPIC_API_KEY to your environment.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AutomationRules({
  activeTab,
  recentTenders,
  chatQuestion,
  setChatQuestion,
  chatResponse,
  chatLoading,
  aiStatus,
  onAskAI,
}) {
  if (activeTab === 'recent') {
    return <RecentTendersPanel recentTenders={recentTenders} />;
  }

  if (activeTab === 'assistant') {
    return (
      <AIAssistantPanel
        chatQuestion={chatQuestion}
        setChatQuestion={setChatQuestion}
        chatResponse={chatResponse}
        chatLoading={chatLoading}
        aiStatus={aiStatus}
        onAskAI={onAskAI}
      />
    );
  }

  return null;
}
