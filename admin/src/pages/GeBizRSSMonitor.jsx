/**
 * GeBIZ RSS Monitor Dashboard
 * Administrative interface for monitoring and controlling RSS scraping
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import {
  Activity,
  Clock,
  Database,
  Download,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText,
  Settings,
  Zap
} from 'lucide-react';

const GeBizRSSMonitor = () => {
  const [status, setStatus] = useState(null);
  const [healthCheck, setHealthCheck] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch status data
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/v1/scraping/gebiz-rss/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  // Fetch health check
  const fetchHealthCheck = async () => {
    try {
      const response = await fetch('/api/v1/scraping/gebiz-rss/health');
      const data = await response.json();
      setHealthCheck(data.data);
    } catch (error) {
      console.error('Error fetching health:', error);
    }
  };

  // Fetch recent logs
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/v1/scraping/gebiz-rss/logs?limit=10');
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Trigger manual scraping
  const triggerManualScrape = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/v1/scraping/gebiz-rss/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        alert(`Scraping completed successfully!\n${data.data.summary.newTenders} new tenders found`);
      } else {
        alert(`Scraping failed: ${data.error}`);
      }

      await refreshData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setActionLoading(false);
  };

  // Control scheduler
  const controlScheduler = async (action) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/v1/scraping/gebiz-rss/scheduler/${action}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert(`Scheduler ${action} successful`);
      } else {
        alert(`Scheduler ${action} failed: ${data.error}`);
      }

      await refreshData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setActionLoading(false);
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStatus(),
      fetchHealthCheck(),
      fetchLogs()
    ]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  // Initial data load
  useEffect(() => {
    refreshData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format time ago
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

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading GeBIZ RSS Monitor...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GeBIZ RSS Monitor</h1>
          <p className="text-gray-600">Automated tender scraping and lifecycle management</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={refreshData}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={triggerManualScrape}
            disabled={actionLoading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Zap className="w-4 h-4 mr-2" />
            Run Scrape
          </Button>
        </div>
      </div>

      {/* Status Overview */}
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

      {/* Health Alerts */}
      {healthCheck && !healthCheck.healthy && (
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
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
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
                            {run.success ? '✅' : '❌'} {timeAgo(run.endTime)}
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
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Scheduler Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Status & Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={status?.scheduler?.isRunning ? 'success' : 'danger'}>
                        {status?.scheduler?.isRunning ? 'Running' : 'Stopped'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Schedule:</span>
                      <span className="text-sm">{status?.scheduler?.cronExpression}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timezone:</span>
                      <span className="text-sm">{status?.scheduler?.timezone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Execution:</span>
                      <span className="text-sm">
                        {status?.scheduler?.nextExecution ?
                          new Date(status.scheduler.nextExecution).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Execution:</span>
                      <span className="text-sm">
                        {status?.scheduler?.lastExecution ?
                          timeAgo(status.scheduler.lastExecution) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Controls</h3>
                  <div className="space-y-3">
                    {status?.scheduler?.isRunning ? (
                      <>
                        <Button
                          onClick={() => controlScheduler('stop')}
                          disabled={actionLoading}
                          className="w-full bg-red-500 hover:bg-red-600"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Stop Scheduler
                        </Button>
                        <Button
                          onClick={() => controlScheduler('restart')}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Restart Scheduler
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => controlScheduler('start')}
                        disabled={actionLoading}
                        className="w-full bg-green-500 hover:bg-green-600"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Scheduler
                      </Button>
                    )}

                    <Button
                      onClick={triggerManualScrape}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Execute Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Jobs Scheduled:</span>
                    <span className="font-bold">{status?.scheduler?.jobsScheduled || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs Executed:</span>
                    <span className="font-bold">{status?.scheduler?.jobsExecuted || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs Completed:</span>
                    <span className="font-bold text-green-600">{status?.scheduler?.jobsCompleted || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs Failed:</span>
                    <span className="font-bold text-red-600">{status?.scheduler?.jobsFailed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Duration:</span>
                    <span className="font-bold">
                      {status?.scheduler?.averageExecutionTime ?
                        `${(status.scheduler.averageExecutionTime / 1000).toFixed(1)}s` : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Service Health:</span>
                    <Badge variant={healthCheck?.healthy ? 'success' : 'danger'}>
                      {healthCheck?.healthy ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Parser Health:</span>
                    <Badge variant={status?.parserStats?.isHealthy ? 'success' : 'warning'}>
                      {status?.parserStats?.isHealthy ? 'Healthy' : 'Issues'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Email Configured:</span>
                    <Badge variant={status?.emailConfigured ? 'success' : 'warning'}>
                      {status?.emailConfigured ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Update:</span>
                    <span className="text-sm">{lastUpdate.toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Recent Execution Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="border rounded p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Badge variant={log.status === 'completed' ? 'success' :
                                       log.status === 'failed' ? 'danger' : 'warning'}>
                            {log.status}
                          </Badge>
                          <span className="ml-2 text-sm text-gray-600">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {log.duration_seconds}s
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Processed:</span>
                          <span className="ml-2 font-medium">{log.records_processed || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">New:</span>
                          <span className="ml-2 font-medium text-green-600">{log.records_new || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Errors:</span>
                          <span className="ml-2 font-medium text-red-600">
                            {log.errors ? JSON.parse(log.errors).length : 0}
                          </span>
                        </div>
                      </div>
                      {log.errors && JSON.parse(log.errors).length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                          <strong>Errors:</strong>
                          <ul className="mt-1 ml-4 list-disc">
                            {JSON.parse(log.errors).map((error, index) => (
                              <li key={index} className="text-red-700">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No logs available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeBizRSSMonitor;