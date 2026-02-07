import React, { useState, useEffect } from 'react';
import {
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  DatabaseIcon,
  ActivityIcon,
  ClockIcon
} from 'lucide-react';

export default function GeBizSyncProgress({ isVisible, onClose }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    total_fetched: 0,
    total_inserted: 0,
    total_skipped: 0,
    errors: 0
  });
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [ws, setWs] = useState(null);

  // Format elapsed time
  const formatElapsedTime = (startTime) => {
    if (!startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update elapsed time every second when sync is running
  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(formatElapsedTime(startTime));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Set up WebSocket connection
  useEffect(() => {
    if (!isVisible) return;

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?admin=true&token=${token}`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('📡 WebSocket connected for GeBIZ sync progress');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'gebiz_sync_progress') {
          const progressData = data.data;

          setProgress(progressData.progress || 0);
          setStage(progressData.stage || 'idle');
          setMessage(progressData.message || '');
          setStats(progressData.stats || {});
          setIsRunning(progressData.is_running || false);

          if (progressData.stage === 'starting' && progressData.is_running) {
            setStartTime(progressData.timestamp);
          }

          if (!progressData.is_running && (progressData.stage === 'complete' || progressData.stage === 'error')) {
            setIsRunning(false);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('📡 WebSocket disconnected');
    };

    websocket.onerror = (error) => {
      console.error('📡 WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getStageIcon = () => {
    switch (stage) {
      case 'complete':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircleIcon className="h-5 w-5 text-red-600" />;
      case 'idle':
        return <DatabaseIcon className="h-5 w-5 text-slate-600" />;
      default:
        return <RefreshCwIcon className={`h-5 w-5 text-blue-600 ${isRunning ? 'animate-spin' : ''}`} />;
    }
  };

  const getProgressColor = () => {
    if (stage === 'error') return 'bg-red-600';
    if (stage === 'complete') return 'bg-green-600';
    return 'bg-blue-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getStageIcon()}
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              GeBIZ Data Sync
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Progress
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {message || 'Waiting for sync to start...'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fetched</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {stats.total_fetched.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <DatabaseIcon className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inserted</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {stats.total_inserted.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Elapsed</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {elapsedTime}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircleIcon className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Errors</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {stats.errors || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Stage */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">Current Stage:</span> {stage.charAt(0).toUpperCase() + stage.slice(1)}
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {isRunning ? (
            'Sync in progress... This may take 30-60 minutes for large datasets.'
          ) : stage === 'complete' ? (
            'Sync completed successfully!'
          ) : stage === 'error' ? (
            'Sync failed. Check server logs for details.'
          ) : (
            'Ready to start sync.'
          )}
        </div>
      </div>
    </div>
  );
}