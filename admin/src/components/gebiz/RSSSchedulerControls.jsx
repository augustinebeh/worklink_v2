/**
 * RSSSchedulerControls - Scheduler control buttons and status
 * Provides start/stop/restart controls and schedule information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import { timeAgo } from './RSSFeedPanel';

const RSSSchedulerControls = ({ status, actionLoading, controlScheduler, triggerManualScrape }) => (
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
);

export default RSSSchedulerControls;
