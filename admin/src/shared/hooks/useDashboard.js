/**
 * Dashboard Query Hooks
 * React Query hooks for dashboard and analytics data
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { analyticsService } from '../services/api';
import { queryKeys } from '../providers/QueryProvider';

/**
 * Hook to fetch main dashboard analytics
 */
export function useDashboardAnalytics(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(queryKeys.dashboard, params),
    queryFn: () => analyticsService.getDashboard(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => ({
      overview: data?.overview || {},
      metrics: data?.metrics || {},
      charts: data?.charts || {},
      recent: data?.recent || {},
      alerts: data?.alerts || [],
      kpis: data?.kpis || {},
    }),
  });
}

/**
 * Hook to fetch financial dashboard data
 */
export function useFinancialDashboard(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(queryKeys.financial, params),
    queryFn: () => analyticsService.getFinancialDashboard(params),
    staleTime: 5 * 60 * 1000, // 5 minutes for financial data
    select: (data) => ({
      revenue: data?.revenue || {},
      expenses: data?.expenses || {},
      profit: data?.profit || {},
      forecasts: data?.forecasts || {},
      trends: data?.trends || {},
      breakdown: data?.breakdown || {},
    }),
  });
}

/**
 * Hook to fetch real-time metrics
 */
export function useRealTimeMetrics() {
  return useQuery({
    queryKey: queryKeys.realtime,
    queryFn: () => analyticsService.getRealTimeMetrics(),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 0, // Always consider stale for real-time data
    gcTime: 1 * 60 * 1000, // 1 minute cache
    select: (data) => ({
      activeUsers: data?.activeUsers || 0,
      activeJobs: data?.activeJobs || 0,
      onlineCandidates: data?.onlineCandidates || 0,
      currentApplications: data?.currentApplications || 0,
      systemLoad: data?.systemLoad || {},
      alerts: data?.alerts || [],
    }),
  });
}

/**
 * Hook to fetch performance analytics by type
 */
export function usePerformanceAnalytics(type, params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(queryKeys.performance(type), params),
    queryFn: () => analyticsService.getPerformance(type, params),
    enabled: !!type,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch retention analytics
 */
export function useRetentionAnalytics(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'retention'], params),
    queryFn: () => analyticsService.getRetention(params),
    staleTime: 10 * 60 * 1000, // 10 minutes for retention data
    select: (data) => ({
      cohorts: data?.cohorts || [],
      trends: data?.trends || {},
      segments: data?.segments || {},
      predictions: data?.predictions || {},
    }),
  });
}

/**
 * Hook to fetch revenue analytics
 */
export function useRevenueAnalytics(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'revenue'], params),
    queryFn: () => analyticsService.getRevenue(params),
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      total: data?.total || 0,
      monthly: data?.monthly || [],
      bySource: data?.bySource || {},
      recurring: data?.recurring || {},
      forecasts: data?.forecasts || {},
    }),
  });
}

/**
 * Hook to fetch conversion funnel data
 */
export function useConversionFunnel(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'funnel'], params),
    queryFn: () => analyticsService.getConversionFunnel(params),
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      steps: data?.steps || [],
      conversions: data?.conversions || {},
      dropoffs: data?.dropoffs || {},
      opportunities: data?.opportunities || [],
    }),
  });
}

/**
 * Hook to fetch engagement metrics
 */
export function useEngagementMetrics(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'engagement'], params),
    queryFn: () => analyticsService.getEngagement(params),
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      daily: data?.daily || [],
      sessions: data?.sessions || {},
      features: data?.features || {},
      satisfaction: data?.satisfaction || {},
    }),
  });
}

/**
 * Hook to fetch market trends
 */
export function useMarketTrends(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'market-trends'], params),
    queryFn: () => analyticsService.getMarketTrends(params),
    staleTime: 30 * 60 * 1000, // 30 minutes for market data
    select: (data) => ({
      trends: data?.trends || [],
      insights: data?.insights || [],
      predictions: data?.predictions || {},
      competitors: data?.competitors || [],
    }),
  });
}

/**
 * Hook to fetch gamification analytics
 */
export function useGamificationAnalytics(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'gamification'], params),
    queryFn: () => analyticsService.getGamification(params),
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      leaderboard: data?.leaderboard || [],
      achievements: data?.achievements || {},
      engagement: data?.engagement || {},
      rewards: data?.rewards || {},
    }),
  });
}

/**
 * Hook to fetch AI performance metrics
 */
export function useAIPerformance(params = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'ai-performance'], params),
    queryFn: () => analyticsService.getAIPerformance(params),
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      models: data?.models || {},
      accuracy: data?.accuracy || {},
      usage: data?.usage || {},
      costs: data?.costs || {},
      predictions: data?.predictions || {},
    }),
  });
}

/**
 * Hook to fetch system health metrics
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['analytics', 'system-health'],
    queryFn: () => analyticsService.getSystemHealth(),
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
    select: (data) => ({
      status: data?.status || 'unknown',
      uptime: data?.uptime || 0,
      performance: data?.performance || {},
      errors: data?.errors || [],
      resources: data?.resources || {},
    }),
  });
}

/**
 * Hook to fetch custom report data
 */
export function useCustomReport(reportId, params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'reports', reportId], params),
    queryFn: () => analyticsService.getCustomReport(reportId, params),
    enabled: !!reportId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Compound hook that fetches all dashboard data in parallel
 */
export function useDashboardData(params = {}) {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.withFilters(queryKeys.dashboard, params),
        queryFn: () => analyticsService.getDashboard(params),
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: queryKeys.withFilters(queryKeys.financial, params),
        queryFn: () => analyticsService.getFinancialDashboard(params),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: queryKeys.realtime,
        queryFn: () => analyticsService.getRealTimeMetrics(),
        refetchInterval: 30 * 1000,
        staleTime: 0,
      },
    ],
  });

  const [dashboardQuery, financialQuery, realtimeQuery] = queries;

  return {
    dashboard: dashboardQuery,
    financial: financialQuery,
    realtime: realtimeQuery,

    // Computed states
    isLoading: queries.some(query => query.isLoading),
    isError: queries.some(query => query.isError),
    isSuccess: queries.every(query => query.isSuccess),

    // Combined data
    data: {
      dashboard: dashboardQuery.data,
      financial: financialQuery.data,
      realtime: realtimeQuery.data,
    },

    // Error information
    errors: queries
      .filter(query => query.isError)
      .map((query, index) => ({
        type: ['dashboard', 'financial', 'realtime'][index],
        error: query.error,
      })),
  };
}

/**
 * Hook for analytics with date range filtering
 */
export function useAnalyticsWithDateRange(analyticsType, dateRange = {}) {
  const { startDate, endDate, period = '30d' } = dateRange;

  const params = {
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    period,
  };

  switch (analyticsType) {
    case 'dashboard':
      return useDashboardAnalytics(params);
    case 'financial':
      return useFinancialDashboard(params);
    case 'retention':
      return useRetentionAnalytics(params);
    case 'revenue':
      return useRevenueAnalytics(params);
    case 'engagement':
      return useEngagementMetrics(params);
    case 'conversion':
      return useConversionFunnel(params);
    default:
      return useDashboardAnalytics(params);
  }
}

/**
 * Hook for comparing analytics across time periods
 */
export function useAnalyticsComparison(analyticsType, currentPeriod, previousPeriod) {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['analytics', analyticsType, 'current', currentPeriod],
        queryFn: () => {
          switch (analyticsType) {
            case 'dashboard':
              return analyticsService.getDashboard(currentPeriod);
            case 'financial':
              return analyticsService.getFinancialDashboard(currentPeriod);
            case 'revenue':
              return analyticsService.getRevenue(currentPeriod);
            default:
              return analyticsService.getDashboard(currentPeriod);
          }
        },
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['analytics', analyticsType, 'previous', previousPeriod],
        queryFn: () => {
          switch (analyticsType) {
            case 'dashboard':
              return analyticsService.getDashboard(previousPeriod);
            case 'financial':
              return analyticsService.getFinancialDashboard(previousPeriod);
            case 'revenue':
              return analyticsService.getRevenue(previousPeriod);
            default:
              return analyticsService.getDashboard(previousPeriod);
          }
        },
        staleTime: 10 * 60 * 1000, // Previous data can be cached longer
      },
    ],
  });

  const [currentQuery, previousQuery] = queries;

  return {
    current: currentQuery,
    previous: previousQuery,
    isLoading: currentQuery.isLoading || previousQuery.isLoading,
    isError: currentQuery.isError || previousQuery.isError,

    // Comparison helpers
    comparison: currentQuery.data && previousQuery.data ? {
      current: currentQuery.data,
      previous: previousQuery.data,
      // Add percentage change calculation here
    } : null,
  };
}