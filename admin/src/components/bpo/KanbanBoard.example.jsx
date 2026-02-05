/**
 * KanbanBoard Integration Example
 *
 * This example shows how to integrate the KanbanBoard component
 * into the BPOTenderLifecycle page.
 *
 * USAGE:
 * 1. Import KanbanBoard component
 * 2. Add state for view mode (list/kanban)
 * 3. Toggle between LifecyclePipeline and KanbanBoard
 * 4. Both components use the same API and data structure
 */

import React, { useState } from 'react';
import {
  LayoutListIcon,
  LayoutGridIcon,
  PlusIcon,
  RefreshCwIcon
} from 'lucide-react';
import { KanbanBoard, LifecyclePipeline, TenderDetailModal, CreateTenderModal } from '../components/bpo';
import { useToast } from '../components/ui/Toast';

export default function BPOTenderLifecycleWithKanban() {
  const [viewMode, setViewMode] = useState('kanban'); // 'list' or 'kanban'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTender, setSelectedTender] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const toast = useToast();

  const handleTenderClick = (tender) => {
    setSelectedTender(tender);
    setShowDetailModal(true);
  };

  const handleStageChange = (tenderId, newStage) => {
    console.log(`Tender ${tenderId} moved to ${newStage}`);
    // The KanbanBoard handles the toast notification internally
    // But you can add additional logic here if needed
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.info('Refreshing', 'Loading latest tender data...');
  };

  const handleCreateTender = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = (newTender) => {
    console.log('New tender created:', newTender);
    setRefreshKey(prev => prev + 1);
    toast.success('Tender Created', 'New tender added to pipeline');
  };

  const handleTenderUpdate = (tenderId, updateData) => {
    console.log('Tender updated:', tenderId, updateData);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            BPO Tender Lifecycle
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            8-stage tender pipeline management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              aria-label="Switch to list view"
            >
              <LayoutListIcon className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center space-x-2 ${
                viewMode === 'kanban'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              aria-label="Switch to kanban view"
            >
              <LayoutGridIcon className="h-4 w-4" />
              <span>Kanban</span>
            </button>
          </div>

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

      {/* Pipeline View */}
      {viewMode === 'list' ? (
        <LifecyclePipeline
          key={refreshKey}
          onTenderClick={handleTenderClick}
          onStageChange={handleStageChange}
        />
      ) : (
        <KanbanBoard
          key={refreshKey}
          onTenderClick={handleTenderClick}
          onStageChange={handleStageChange}
          refreshKey={refreshKey}
        />
      )}

      {/* Feature Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
          Enhanced Pipeline Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
              Kanban View
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Drag-and-drop tenders between stages</li>
              <li>• Visual pipeline with 8 stages</li>
              <li>• Optimistic updates with error rollback</li>
              <li>• Mobile-responsive (touch gestures)</li>
              <li>• Keyboard navigation support</li>
            </ul>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              List View
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Compact card-based layout</li>
              <li>• Stage filtering and statistics</li>
              <li>• Renewal watch predictions</li>
              <li>• Quick BD assignment</li>
              <li>• Detailed tender information</li>
            </ul>
          </div>
        </div>
      </div>

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
