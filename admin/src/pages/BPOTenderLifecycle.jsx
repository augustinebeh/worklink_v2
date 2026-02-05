import React, { useState } from 'react';
import { 
  PlusIcon,
  RefreshCwIcon,
  FilterIcon,
  DownloadIcon
} from 'lucide-react';
import { LifecyclePipeline, TenderDetailModal, CreateTenderModal } from '../components/bpo';
import { useToast } from '../components/ui/Toast';

export default function BPOTenderLifecycle() {
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
    // Refresh pipeline to show updated stages
    setRefreshKey(prev => prev + 1);
    // Show success toast
    toast.success('Stage Updated', `Tender moved to ${newStage}`);
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
          <h1 className="text-2xl font-bold text-gray-900">BPO Tender Lifecycle</h1>
          <p className="text-gray-600 mt-1">7-stage tender pipeline management</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <RefreshCwIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleCreateTender}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Tender</span>
          </button>
        </div>
      </div>

      {/* Pipeline Component */}
      <LifecyclePipeline 
        key={refreshKey}
        onTenderClick={handleTenderClick}
        onStageChange={handleStageChange}
      />

      {/* Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Enhanced Pipeline with Renewal Watch</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-800 mb-4">
          <div className="bg-white rounded p-2 border border-purple-200">
            <span className="font-medium text-purple-700">1. Renewal Watch</span>
            <p className="text-xs text-gray-600 mt-1">AI-predicted renewals with probability scores</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">2. New Opportunity</span>
            <p className="text-xs text-gray-600 mt-1">Fresh opportunities & moved renewals</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">3. Review</span>
            <p className="text-xs text-gray-600 mt-1">Qualification assessment</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">4. Bidding</span>
            <p className="text-xs text-gray-600 mt-1">Proposal preparation</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">5. Approval</span>
            <p className="text-xs text-gray-600 mt-1">Internal sign-off</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">6. Submitted</span>
            <p className="text-xs text-gray-600 mt-1">Proposal submitted</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">7. Won</span>
            <p className="text-xs text-gray-600 mt-1">Contract awarded</p>
          </div>
          <div className="bg-white rounded p-2">
            <span className="font-medium">8. Lost</span>
            <p className="text-xs text-gray-600 mt-1">Opportunity declined</p>
          </div>
        </div>

        <div className="bg-purple-100 rounded-lg p-3 border border-purple-200">
          <h4 className="text-sm font-medium text-purple-800 mb-2">New Features</h4>
          <ul className="text-xs text-purple-700 space-y-1">
            <li>• <strong>Ghost Cards:</strong> Renewal predictions show probability badges and expiry timelines</li>
            <li>• <strong>Auto-Move:</strong> When RFP published, renewals automatically move to New Opportunity</li>
            <li>• <strong>BD Assignment:</strong> Quick assign BD managers with avatar display</li>
            <li>• <strong>Smart Filtering:</strong> Enhanced filtering by stage, priority, and renewal status</li>
          </ul>
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
