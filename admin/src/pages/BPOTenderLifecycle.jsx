import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  RefreshCwIcon
} from 'lucide-react';
import { LifecyclePipeline, TenderDetailModal, CreateTenderModal } from '../components/bpo';
import { useToast } from '../components/ui/Toast';

export default function BPOTenderLifecycle() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [pipelineStats, setPipelineStats] = useState({});
  const toast = useToast();

  // Fetch pipeline stats for analytics bar
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/v1/pipeline/stats');
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          setPipelineStats({
            active: (d.new_opportunity || 0) + (d.review || 0) + (d.bidding || 0) + (d.internal_approval || 0) + (d.submitted || 0),
            value: d.total_pipeline_value || 0,
            winRate: d.win_rate || 0,
            closingSoon: d.closing_soon || 0,
            submitted: d.submitted || 0,
            newOpp: d.new_opportunity || 0,
            review: d.review || 0,
            bidding: d.bidding || 0,
            won: d.won || 0,
            lost: d.lost || 0,
            wonValue: d.total_won_value || 0,
            renewalWatch: d.renewal_watch || 0,
            urgent: d.urgent || 0,
          });
        }
      } catch (e) {
        console.error('Error fetching pipeline stats:', e);
      }
    };
    fetchStats();
  }, [refreshKey]);

  const handleTenderClick = (tender) => {
    setSelectedTender(tender);
    setShowDetailModal(true);
  };

  const handleStageChange = (tenderId, newStage) => {
    console.log(`Tender ${tenderId} moved to ${newStage}`);
    // No need to refresh - optimistic updates handle this
    // Toast is already shown in useKanbanDnd hook
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateTender = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = (newTender) => {
    console.log('New tender created:', newTender);
    // Refresh the pipeline to show the new tender
    setRefreshKey(prev => prev + 1);
  };

  const handleTenderUpdate = (tenderId, updateData) => {
    console.log('Tender updated:', tenderId, updateData);
    // Refresh the pipeline to show updated data
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tender Pipeline</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage active deals through the 7-stage pipeline</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2"
          >
            <RefreshCwIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleCreateTender}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Tender</span>
          </button>
        </div>
      </div>

      {/* Pipeline Analytics Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pipeline Overview</h3>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {showAnalytics ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{pipelineStats.active || 0}</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">Active Deals</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${((pipelineStats.value || 0) / 1000000).toFixed(1)}M</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">Pipeline Value</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{pipelineStats.winRate || 0}%</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">Win Rate</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pipelineStats.closingSoon || 0}</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">Closing Soon</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{pipelineStats.submitted || 0}</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">Awaiting Result</p>
          </div>
        </div>

        {/* Expanded Analytics */}
        {showAnalytics && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Conversion Funnel */}
              <div>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">Conversion Funnel</h4>
                <div className="space-y-2">
                  {[
                    { label: 'New Opportunities', count: pipelineStats.newOpp || 0, color: 'bg-blue-500' },
                    { label: 'In Review', count: pipelineStats.review || 0, color: 'bg-yellow-500' },
                    { label: 'Bidding', count: pipelineStats.bidding || 0, color: 'bg-orange-500' },
                    { label: 'Submitted', count: pipelineStats.submitted || 0, color: 'bg-cyan-500' },
                    { label: 'Won', count: pipelineStats.won || 0, color: 'bg-green-500' },
                  ].map((stage) => (
                    <div key={stage.label} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 dark:text-slate-400 w-28 text-right">{stage.label}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                        <div
                          className={`${stage.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, (stage.count / Math.max(pipelineStats.newOpp || 1, 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8">{stage.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">Pipeline Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total Won Value</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">${((pipelineStats.wonValue || 0) / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total Lost</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{pipelineStats.lost || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Renewal Watch</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{pipelineStats.renewalWatch || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Urgent Tenders</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{pipelineStats.urgent || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Component */}
      <LifecyclePipeline
        key={refreshKey}
        onTenderClick={handleTenderClick}
        onStageChange={handleStageChange}
        refreshKey={refreshKey}
      />

      {/* Modals */}
      <TenderDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        tender={selectedTender}
        onUpdate={handleTenderUpdate}
        onStageChange={handleStageChange}
      />

      <CreateTenderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
