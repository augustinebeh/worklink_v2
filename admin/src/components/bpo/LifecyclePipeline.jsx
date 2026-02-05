import React, { useState, useEffect } from 'react';
import { lifecycleService, renewalService } from '../../shared/services/api';
import {
  EyeIcon,
  CheckCircleIcon,
  FileTextIcon,
  SendIcon,
  TrophyIcon,
  XCircleIcon,
  AlertCircleIcon,
  DollarSignIcon,
  ClockIcon,
  UserIcon,
  BuildingIcon,
  ArrowRightIcon,
  PercentIcon,
  CalendarIcon,
  Users2Icon
} from 'lucide-react';

/**
 * Tender Lifecycle Pipeline Component
 * 7-stage tender management pipeline with drag-and-drop (future feature)
 */
export default function LifecyclePipeline({ onTenderClick, onStageChange }) {
  const [tenders, setTenders] = useState([]);
  const [renewalWatchData, setRenewalWatchData] = useState([]);
  const [bdManagers, setBdManagers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('all');
  const [movingTenders, setMovingTenders] = useState(new Set());

  const stages = [
    { id: 'renewal_watch', name: 'Renewal Watch', icon: EyeIcon, color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'new_opportunity', name: 'New Opportunity', icon: AlertCircleIcon, color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'review', name: 'Review', icon: FileTextIcon, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { id: 'bidding', name: 'Bidding', icon: FileTextIcon, color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { id: 'internal_approval', name: 'Approval', icon: CheckCircleIcon, color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    { id: 'submitted', name: 'Submitted', icon: SendIcon, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
    { id: 'awarded', name: 'Won', icon: TrophyIcon, color: 'bg-green-100 text-green-700 border-green-300' },
    { id: 'lost', name: 'Lost', icon: XCircleIcon, color: 'bg-red-100 text-red-700 border-red-300' }
  ];

  // BD Managers for assignment dropdown
  const bdManagersList = [
    { id: 'sarah_tan', name: 'Sarah Tan', avatar: 'ST' },
    { id: 'david_lim', name: 'David Lim', avatar: 'DL' },
    { id: 'michelle_wong', name: 'Michelle Wong', avatar: 'MW' },
    { id: 'alex_chen', name: 'Alex Chen', avatar: 'AC' },
    { id: 'priya_sharma', name: 'Priya Sharma', avatar: 'PS' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedStage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tendersRes, statsRes, renewalsRes] = await Promise.all([
        lifecycleService.getTenders(
          selectedStage !== 'all' ? { stage: selectedStage } : {}
        ),
        lifecycleService.getPipelineStats(),
        renewalService.getRenewals({ status: 'upcoming', months_ahead: 18 })
      ]);

      if (tendersRes.success) {
        setTenders(tendersRes.data || []);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (renewalsRes.success) {
        setRenewalWatchData(renewalsRes.data?.renewals || []);
      }
    } catch (err) {
      console.error('Error fetching lifecycle data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (tenderId, newStage) => {
    try {
      setMovingTenders(prev => new Set([...prev, tenderId]));

      await lifecycleService.moveTender(tenderId, {
        new_stage: newStage,
        user_id: sessionStorage.getItem('user_id') || 'admin'
      });

      // Add animation delay
      setTimeout(() => {
        setMovingTenders(prev => {
          const newSet = new Set(prev);
          newSet.delete(tenderId);
          return newSet;
        });
        fetchData();
        if (onStageChange) onStageChange(tenderId, newStage);
      }, 500);
    } catch (err) {
      console.error('Error moving tender:', err);
      setMovingTenders(prev => {
        const newSet = new Set(prev);
        newSet.delete(tenderId);
        return newSet;
      });
    }
  };

  const handleRenewalToOpportunity = async (renewalId) => {
    try {
      setMovingTenders(prev => new Set([...prev, `renewal_${renewalId}`]));

      // Use the new API endpoint to move renewal to opportunity
      await lifecycleService.moveRenewalToOpportunity(renewalId);

      setTimeout(() => {
        setMovingTenders(prev => {
          const newSet = new Set(prev);
          newSet.delete(`renewal_${renewalId}`);
          return newSet;
        });
        fetchData();
      }, 800);
    } catch (err) {
      console.error('Error moving renewal to opportunity:', err);
      setMovingTenders(prev => {
        const newSet = new Set(prev);
        newSet.delete(`renewal_${renewalId}`);
        return newSet;
      });
    }
  };

  const handleBdAssignment = async (tenderId, bdManagerId, isRenewal = false) => {
    try {
      if (isRenewal) {
        await renewalService.updateRenewal(tenderId, {
          assigned_bd_manager: bdManagerId
        });
      } else {
        await lifecycleService.updateTender(tenderId, {
          assigned_to: bdManagerId
        });
      }
      fetchData();
    } catch (err) {
      console.error('Error assigning BD manager:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-l-4 border-red-500 bg-red-50';
      case 'high': return 'border-l-4 border-orange-500 bg-orange-50';
      case 'medium': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-4 border-blue-500 bg-blue-50';
      default: return 'border-l-4 border-gray-300';
    }
  };

  const getTendersByStage = (stageId) => {
    if (stageId === 'renewal_watch') {
      return renewalWatchData;
    }
    return tenders.filter(t => t.stage === stageId);
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (probability >= 60) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (probability >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getMonthsUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMonths = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  };

  const getBdManager = (managerId) => {
    return bdManagersList.find(manager => manager.id === managerId);
  };

  const formatDeadline = (date) => {
    if (!date) return null;
    const deadline = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (diffDays === 0) return { text: 'Today', color: 'text-red-600' };
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-orange-600' };
    if (diffDays <= 7) return { text: `${diffDays} days`, color: 'text-orange-600' };
    return { text: `${diffDays} days`, color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {stages.map((stage) => {
            let count = 0;
            if (stage.id === 'renewal_watch') {
              count = renewalWatchData.length;
            } else {
              count = stats?.[`${stage.id}_count`] || 0;
            }

            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedStage === stage.id
                    ? stage.color + ' border-current shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <stage.icon className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs mt-1">{stage.name}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Additional Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.total_pipeline_value / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSignIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.win_rate}%
                </p>
              </div>
              <TrophyIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tenders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_tenders}
                </p>
              </div>
              <FileTextIcon className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>
      )}

      {/* Stage Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStage('all')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            selectedStage === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Stages
        </button>
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              selectedStage === stage.id
                ? stage.color + ' border-2'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {stage.name}
          </button>
        ))}
      </div>

      {/* Tender and Renewal Cards */}
      <div className="space-y-3">
        {selectedStage === 'renewal_watch' && renderRenewalCards()}
        {selectedStage !== 'renewal_watch' && renderTenderCards()}
        {selectedStage === 'all' && (
          <>
            {renderRenewalCards()}
            {renderTenderCards()}
          </>
        )}
      </div>
    </div>
  );

  // Render renewal cards for Renewal Watch stage
  function renderRenewalCards() {
    if (renewalWatchData.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <EyeIcon className="h-12 w-12 text-purple-400 mx-auto mb-3" />
          <p className="text-gray-600">No renewal predictions available</p>
        </div>
      );
    }

    return renewalWatchData.map((renewal) => {
      const monthsUntilExpiry = getMonthsUntilExpiry(renewal.contract_end_date);
      const assignedBd = getBdManager(renewal.assigned_bd_manager);
      const isMoving = movingTenders.has(`renewal_${renewal.id}`);

      return (
        <div
          key={`renewal_${renewal.id}`}
          className={`bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-4 cursor-pointer transition-all duration-500 transform ${
            isMoving ? 'scale-95 opacity-75' : 'hover:shadow-md hover:scale-[1.02]'
          }`}
          style={{ opacity: isMoving ? 0.7 : 1 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <EyeIcon className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                      Renewal Prediction
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getProbabilityColor(renewal.renewal_probability)}`}>
                      {renewal.renewal_probability}% <PercentIcon className="h-3 w-3 inline" />
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900">
                    {renewal.title || `${renewal.agency} - ${renewal.service_category}`}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <BuildingIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-sm text-gray-600">{renewal.agency}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                {renewal.estimated_value && (
                  <div className="flex items-center space-x-1">
                    <DollarSignIcon className="h-3 w-3" />
                    <span>${renewal.estimated_value.toLocaleString()}</span>
                  </div>
                )}
                {monthsUntilExpiry && (
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span className={monthsUntilExpiry <= 6 ? 'text-orange-600' : 'text-gray-600'}>
                      {monthsUntilExpiry} months until expiry
                    </span>
                  </div>
                )}
                {renewal.current_supplier && (
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Current: {renewal.current_supplier}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {/* BD Assignment */}
                <select
                  value={renewal.assigned_bd_manager || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleBdAssignment(renewal.id, e.target.value, true);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Assign BD Manager</option>
                  {bdManagersList.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>

                {assignedBd && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {assignedBd.avatar}
                    </div>
                    <span>{assignedBd.name}</span>
                  </div>
                )}

                {/* Move to Opportunity */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenewalToOpportunity(renewal.id);
                  }}
                  disabled={isMoving}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  {isMoving ? (
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <ArrowRightIcon className="h-3 w-3" />
                      <span>Move to Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }

  // Render tender cards for other stages
  function renderTenderCards() {
    const displayTenders = selectedStage === 'all' ? tenders : getTendersByStage(selectedStage);

    if (displayTenders.length === 0 && selectedStage !== 'renewal_watch') {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No tenders in this stage</p>
        </div>
      );
    }

    return displayTenders.map((tender) => {
      const deadline = tender.closing_date ? formatDeadline(tender.closing_date) : null;
      const stage = stages.find(s => s.id === tender.stage);
      const assignedBd = getBdManager(tender.assigned_to);
      const isMoving = movingTenders.has(tender.id);

      return (
        <div
          key={tender.id}
          onClick={() => onTenderClick && onTenderClick(tender)}
          className={`bg-white rounded-lg border p-4 cursor-pointer transition-all duration-300 transform ${getPriorityColor(tender.priority)} ${
            isMoving ? 'scale-95 opacity-75' : 'hover:shadow-md hover:scale-[1.01]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{tender.title}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <BuildingIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-sm text-gray-600">{tender.agency}</span>
                    {tender.is_renewal && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        RENEWAL
                      </span>
                    )}
                  </div>
                </div>
                {stage && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                    {stage.name}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {tender.estimated_value && (
                  <div className="flex items-center space-x-1">
                    <DollarSignIcon className="h-3 w-3" />
                    <span>${tender.estimated_value.toLocaleString()}</span>
                  </div>
                )}
                {deadline && (
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-3 w-3" />
                    <span className={deadline.color}>{deadline.text}</span>
                  </div>
                )}
                {tender.urgent && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                    URGENT
                  </span>
                )}
              </div>

              {/* Stage Actions */}
              <div className="mt-3 flex items-center space-x-2">
                {/* BD Assignment */}
                {!tender.assigned_to && (
                  <select
                    value=""
                    onChange={(e) => {
                      e.stopPropagation();
                      handleBdAssignment(tender.id, e.target.value, false);
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Assign BD Manager</option>
                    {bdManagersList.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                )}

                {assignedBd && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {assignedBd.avatar}
                    </div>
                    <span>{assignedBd.name}</span>
                  </div>
                )}

                {/* Stage Movement */}
                {tender.stage !== 'awarded' && tender.stage !== 'lost' && (
                  <select
                    value={tender.stage}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStageChange(tender.id, e.target.value);
                    }}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isMoving}
                  >
                    {stages.filter(s => s.id !== 'awarded' && s.id !== 'lost' && s.id !== 'renewal_watch').map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        Move to {stage.name}
                      </option>
                    ))}
                  </select>
                )}

                {isMoving && (
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                    <span>Moving...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  }
}
