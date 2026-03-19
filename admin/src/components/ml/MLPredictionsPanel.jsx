import { Database, MessageSquare } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

function KnowledgeBaseView({ knowledgeBase }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Learned Knowledge Base
        </h3>
      </div>

      {knowledgeBase.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Knowledge base is empty</p>
          <p className="text-sm mt-1">It will grow as the AI learns from conversations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {knowledgeBase.map(entry => (
            <div key={entry.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-slate-900 dark:text-white">
                  {entry.question}
                </p>
                <Badge
                  variant={entry.confidence >= 0.8 ? 'success' : entry.confidence >= 0.5 ? 'warning' : 'default'}
                  size="xs"
                >
                  {Math.round(entry.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {entry.answer}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span>Used {entry.use_count || 0}x</span>
                <span>Source: {entry.source}</span>
                {entry.intent && <span>Intent: {entry.intent}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ResponseLogsView({ responseLogs }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Recent AI Responses
      </h3>

      {responseLogs.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No response logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {responseLogs.map(log => (
            <div key={log.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-l-4 border-l-primary-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={log.source === 'knowledge_base' ? 'success' : 'primary'} size="xs">
                    {log.source === 'knowledge_base' ? 'KB' : 'LLM'}
                  </Badge>
                  <Badge variant={log.status === 'sent' ? 'success' : 'warning'} size="xs">
                    {log.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                <strong>Q:</strong> {log.incoming_message}
              </p>
              <p className="text-sm text-slate-900 dark:text-white">
                <strong>A:</strong> {log.ai_response}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function MLPredictionsPanel({ activeTab, knowledgeBase, responseLogs }) {
  if (activeTab === 'knowledge') {
    return <KnowledgeBaseView knowledgeBase={knowledgeBase} />;
  }

  if (activeTab === 'logs') {
    return <ResponseLogsView responseLogs={responseLogs} />;
  }

  return null;
}
