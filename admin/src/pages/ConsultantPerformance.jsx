/**
 * 100x Consultant Performance Dashboard
 * Main control interface for pain-point solutions
 */

import React, { useState, useEffect } from 'react';
import { User, Zap, TrendingUp, Calendar } from 'lucide-react';

const ConsultantPerformance = () => {
  const [metrics, setMetrics] = useState({
    totalConsultants: 0,
    activeConsultants: 0,
    reliabilityScore: 0,
    automationRate: 0
  });

  const runInterviewScheduling = async () => {
    // Placeholder for interview scheduling functionality
    console.log('Interview scheduling system activated');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Consultant Performance
        </h1>
        <p className="text-gray-600 mt-1">100x performance dashboard and pain-point solutions</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Consultants</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalConsultants}</p>
            </div>
            <User className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active This Week</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeConsultants}</p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Reliability</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.reliabilityScore}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Automation</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.automationRate}%</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Pain Point Solutions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pain Point Solutions</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">SLM Interview Scheduling</h3>
                <p className="text-sm text-gray-600">Automated scheduling for pending candidates</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">AI Chat Integration</h3>
                <p className="text-sm text-gray-600">Smart response routing with real data</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Performance Tracking</h3>
                <p className="text-sm text-gray-600">Reliability and engagement scoring</p>
              </div>
            </div>
            <button
              onClick={runInterviewScheduling}
              className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full hover:bg-yellow-200"
            >
              CONFIGURE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantPerformance;