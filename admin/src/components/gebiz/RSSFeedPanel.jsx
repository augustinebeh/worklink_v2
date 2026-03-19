/**
 * RSSFeedPanel - RSS feed display section
 * Shows recent activity, parser statistics, and health alerts
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/Alert';
import {
  AlertCircle,
  CheckCircle,
  Activity,
  Clock,
  TrendingUp,
  Database
} from 'lucide-react';

// Format time ago helper
const timeAgo = (timestamp) => {
  if (!timestamp) return 'Never';

  const now = new Date();
  const time = new Date(timestamp);
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// Get status badge
const getStatusBadge = (isHealthy, isRunning) => {
  if (isHealthy && isRunning) {
    return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
  } else if (isRunning) {
    return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Warning</Badge>;
  } else {
    return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" />Stopped</Badge>;
  }
};

/** Status overview cards row */
export const StatusOverviewCards = ({ status, healthCheck }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Service Status</p>
            <p className="text-2xl font-bold">
              {healthCheck?.healthy ? 'Healthy' : 'Issues'}
            </p>
          </div>
          <Activity className="w-8 h-8 text-blue-500" />
        </div>
        <div className="mt-4">
          {getStatusBadge(healthCheck?.healthy, status?.scheduler?.isRunning)}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Next Run</p>
            <p className="text-lg font-bold">
              {status?.scheduler?.nextExecution ?
                timeAgo(status.scheduler.nextExecution) : 'Unknown'}
            </p>
          </div>
          <Clock className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {status?.scheduler?.cronExpression} SGT
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Last Run</p>
            <p className="text-lg font-bold">
              {status?.orchestrator?.lastRun ?
                timeAgo(status.orchestrator.lastRun.endTime) : 'Never'}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-500" />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {status?.orchestrator?.lastRun?.summary?.newTenders || 0} new tenders
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className="text-2xl font-bold">
              {status?.scheduler?.successRate || '0%'}
            </p>
          </div>
          <Database className="w-8 h-8 text-orange-500" />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {status?.scheduler?.totalJobs || 0} total jobs
        </p>
      </CardContent>
    </Card>
  </div>
);

/** Health alerts banner */
export const HealthAlerts = ({ healthCheck }) => {
  if (!healthCheck || healthCheck.healthy) return null;

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <strong>System Issues Detected:</strong>
        <ul className="mt-2 ml-4 list-disc">
          {!healthCheck.checks.initialized && <li>Service not properly initialized</li>}
          {!healthCheck.checks.parser && <li>Parser experiencing errors</li>}
          {!healthCheck.checks.scheduler && <li>Scheduler not healthy</li>}
          {!healthCheck.checks.orchestrator && <li>Last orchestration failed</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

/** Overview tab content: Recent Activity + Parser Statistics */
export const OverviewPanel = ({ status }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {status?.orchestrator?.recentRuns?.length > 0 ? (
          <div className="space-y-3">
            {status.orchestrator.recentRuns.map((run, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">
                    {run.success ? '\u2705' : '\u274C'} {timeAgo(run.endTime)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {run.summary.newTenders} new, {run.summary.duplicates} duplicates
                  </p>
                </div>
                <Badge variant={run.success ? 'success' : 'danger'}>
                  {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'N/A'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent activity</p>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Parser Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Total Parsed:</span>
            <span className="font-bold">{status?.parserStats?.totalParsed || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>New Tenders:</span>
            <span className="font-bold text-green-600">{status?.parserStats?.newTenders || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Duplicates:</span>
            <span className="font-bold text-yellow-600">{status?.parserStats?.duplicates || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Errors:</span>
            <span className="font-bold text-red-600">{status?.parserStats?.errors || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Success Rate:</span>
            <span className="font-bold">{status?.parserStats?.successRate || 'N/A'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export { timeAgo };
