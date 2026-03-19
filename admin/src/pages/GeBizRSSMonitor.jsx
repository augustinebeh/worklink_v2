/**
 * GeBIZ RSS Monitor Dashboard
 * Administrative interface for monitoring and controlling RSS scraping
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { RefreshCw, Zap } from 'lucide-react';

import { StatusOverviewCards, HealthAlerts, OverviewPanel } from '../components/gebiz/RSSFeedPanel';
import RSSSchedulerControls from '../components/gebiz/RSSSchedulerControls';
import { StatisticsPanel, LogsPanel } from '../components/gebiz/RSSTenderTable';

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
      // Error fetching status
    }
  };

  // Fetch health check
  const fetchHealthCheck = async () => {
    try {
      const response = await fetch('/api/v1/scraping/gebiz-rss/health');
      const data = await response.json();
      setHealthCheck(data.data);
    } catch (error) {
      // Error fetching health
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
      // Error fetching logs
    }
  };

  // Trigger manual scraping
  const triggerManualScrape = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/v1/scraping/gebiz-rss/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await refreshData();
    } catch (error) {
      // Scraping error
    }
    setActionLoading(false);
  };

  // Control scheduler
  const controlScheduler = async (action) => {
    setActionLoading(true);
    try {
      await fetch(`/api/v1/scraping/gebiz-rss/scheduler/${action}`, {
        method: 'POST'
      });
      await refreshData();
    } catch (error) {
      // Scheduler control error
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

  // Initial data load and auto-refresh
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <Button onClick={refreshData} disabled={loading} variant="outline">
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

      <StatusOverviewCards status={status} healthCheck={healthCheck} />
      <HealthAlerts healthCheck={healthCheck} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel status={status} />
        </TabsContent>

        <TabsContent value="scheduler">
          <RSSSchedulerControls
            status={status}
            actionLoading={actionLoading}
            controlScheduler={controlScheduler}
            triggerManualScrape={triggerManualScrape}
          />
        </TabsContent>

        <TabsContent value="statistics">
          <StatisticsPanel
            status={status}
            healthCheck={healthCheck}
            lastUpdate={lastUpdate}
          />
        </TabsContent>

        <TabsContent value="logs">
          <LogsPanel logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeBizRSSMonitor;
