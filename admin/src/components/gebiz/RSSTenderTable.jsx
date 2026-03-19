/**
 * RSSTenderTable - Tender results display
 * Shows execution statistics, system health, and execution logs
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { FileText } from 'lucide-react';

/** Statistics tab content: Execution Statistics + System Health */
export const StatisticsPanel = ({ status, healthCheck, lastUpdate }) => (
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
);

/** Logs tab content: Recent Execution Logs */
export const LogsPanel = ({ logs }) => (
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
);
