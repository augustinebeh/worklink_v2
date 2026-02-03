/**
 * Dashboard Migration Example
 * Shows how to migrate Dashboard.jsx from direct fetch calls to React Query
 */

// === BEFORE (Current approach) ===
/*
import { useState, useEffect } from 'react';

function Dashboard() {
  const [data, setData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(['welcome']);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, financialRes] = await Promise.all([
        fetch('/api/v1/analytics/dashboard'),
        fetch('/api/v1/analytics/financial/dashboard'),
      ]);

      const analyticsData = await analyticsRes.json();
      const finData = await financialRes.json();

      if (analyticsData.success) setData(analyticsData.data);
      if (finData.success) setFinancialData(finData.data);

      // Auto-complete onboarding steps based on data
      const autoComplete = ['welcome'];
      if (analyticsData.data?.clients?.total > 0) autoComplete.push('add_client');
      if (analyticsData.data?.jobs?.total > 0) autoComplete.push('create_job');
      if (analyticsData.data?.candidates?.total > 0) autoComplete.push('recruit_candidate');
      if (analyticsData.data?.deployments?.completed > 0) autoComplete.push('first_deployment', 'track_financials');
      setCompletedSteps(autoComplete);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return <div className="animate-spin">Loading...</div>;
  }

  // Rest of component...
}
*/

// === AFTER (React Query approach) ===

import { useState, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboard';
import ErrorBoundary from '../components/ErrorBoundary';
import { DataErrorFallback } from '../components/ErrorFallbacks';

function Dashboard() {
  const [completedSteps, setCompletedSteps] = useState(['welcome']);

  // Replace multiple fetch calls with a single hook
  const {
    dashboard,
    financial,
    realtime,
    isLoading,
    isError,
    errors,
    data
  } = useDashboardData();

  // Compute onboarding steps based on data (runs only when data changes)
  const autoCompletedSteps = useMemo(() => {
    if (!data.dashboard) return ['welcome'];

    const autoComplete = ['welcome'];
    const dashboardData = data.dashboard;

    if (dashboardData?.clients?.total > 0) autoComplete.push('add_client');
    if (dashboardData?.jobs?.total > 0) autoComplete.push('create_job');
    if (dashboardData?.candidates?.total > 0) autoComplete.push('recruit_candidate');
    if (dashboardData?.deployments?.completed > 0) {
      autoComplete.push('first_deployment', 'track_financials');
    }

    return autoComplete;
  }, [data.dashboard]);

  // Update completed steps when auto-computed steps change
  React.useEffect(() => {
    setCompletedSteps(autoCompletedSteps);
  }, [autoCompletedSteps]);

  // Loading state (handled automatically by React Query)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state (with specific error handling for each data source)
  if (isError) {
    return (
      <ErrorBoundary level="page">
        <div className="space-y-4">
          {errors.map(({ type, error }) => (
            <DataErrorFallback
              key={type}
              message={`Failed to load ${type} data: ${error.message}`}
              onRetry={() => {
                // React Query provides refetch automatically
                switch (type) {
                  case 'dashboard':
                    dashboard.refetch();
                    break;
                  case 'financial':
                    financial.refetch();
                    break;
                  case 'realtime':
                    realtime.refetch();
                    break;
                }
              }}
            />
          ))}
        </div>
      </ErrorBoundary>
    );
  }

  // Main dashboard content
  return (
    <div className="space-y-6">
      {/* Real-time metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Active Users"
          value={data.realtime?.activeUsers || 0}
          isLoading={realtime.isLoading}
        />
        <MetricCard
          title="Active Jobs"
          value={data.realtime?.activeJobs || 0}
          isLoading={realtime.isLoading}
        />
        <MetricCard
          title="Online Candidates"
          value={data.realtime?.onlineCandidates || 0}
          isLoading={realtime.isLoading}
        />
        <MetricCard
          title="Applications"
          value={data.realtime?.currentApplications || 0}
          isLoading={realtime.isLoading}
        />
      </div>

      {/* Dashboard analytics */}
      <DashboardCharts
        data={data.dashboard}
        isLoading={dashboard.isLoading}
        onRefresh={() => dashboard.refetch()}
      />

      {/* Financial data */}
      <FinancialOverview
        data={data.financial}
        isLoading={financial.isLoading}
        onRefresh={() => financial.refetch()}
      />

      {/* Onboarding steps */}
      <OnboardingGuide
        completedSteps={completedSteps}
        onStepComplete={(step) => {
          if (!completedSteps.includes(step)) {
            setCompletedSteps([...completedSteps, step]);
          }
        }}
      />
    </div>
  );
}

// Helper component for metrics with loading state
function MetricCard({ title, value, isLoading, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          {isLoading ? (
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-600 animate-pulse rounded"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {value.toLocaleString()}
            </p>
          )}
        </div>
        {Icon && <Icon className="h-8 w-8 text-gray-400" />}
      </div>
    </div>
  );
}

// === Benefits of Migration ===

/*
BEFORE vs AFTER Comparison:

BEFORE (Direct Fetch):
❌ Manual loading state management
❌ Manual error handling
❌ No automatic retries
❌ No caching
❌ No background refetching
❌ Manual data synchronization
❌ Difficult to test
❌ No optimistic updates
❌ Manual request deduplication

AFTER (React Query):
✅ Automatic loading states
✅ Built-in error handling with retry logic
✅ Intelligent background refetching
✅ Automatic caching with invalidation
✅ Request deduplication
✅ Optimistic updates support
✅ Easy testing with mock queries
✅ DevTools for debugging
✅ Automatic garbage collection
✅ Window focus refetching
✅ Network status handling

PERFORMANCE IMPROVEMENTS:
- Data is cached and reused across components
- Background refetching keeps data fresh
- Automatic request deduplication
- Smart stale-while-revalidate strategy
- Reduced API calls through intelligent caching

DEVELOPER EXPERIENCE:
- Less boilerplate code (30+ lines → 5 lines for data fetching)
- Better error handling with user-friendly fallbacks
- Automatic loading states
- Hot reloading works better with cached data
- React Query DevTools for debugging

MIGRATION STEPS:
1. Install @tanstack/react-query
2. Wrap app with QueryProvider
3. Replace useState + useEffect + fetch with React Query hooks
4. Add error boundaries for graceful error handling
5. Update components to use new data structure
6. Remove manual loading/error state management
7. Test with React Query DevTools
*/

export default Dashboard;