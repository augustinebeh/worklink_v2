/**
 * React Query Provider Setup
 * Configures TanStack Query for the entire application
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { authService } from '../services/api';

/**
 * Create Query Client with optimized configuration
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global query defaults
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 mins
      gcTime: 10 * 60 * 1000, // 10 minutes - cache time (was cacheTime)
      retry: (failureCount, error) => {
        // Don't retry for authentication errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }

        // Don't retry for client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }

        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch on window focus by default
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Global mutation defaults
      retry: (failureCount, error) => {
        // Don't retry mutations for client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }

        // Only retry once for mutations
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});

/**
 * Add global error handling to the query client
 */
queryClient.setMutationDefaults(['auth'], {
  mutationFn: ({ type, ...params }) => {
    switch (type) {
      case 'login':
        return authService.login(params.email, params.password);
      case 'logout':
        return authService.logout();
      case 'refresh':
        return authService.refreshToken();
      default:
        throw new Error(`Unknown auth mutation type: ${type}`);
    }
  },
});

/**
 * Query key factory for consistent key generation
 */
export const queryKeys = {
  // Auth keys
  auth: ['auth'],
  user: ['auth', 'user'],
  permissions: ['auth', 'permissions'],

  // Candidates keys
  candidates: ['candidates'],
  candidate: (id) => ['candidates', id],
  candidatePerformance: (id) => ['candidates', id, 'performance'],
  candidateApplications: (id) => ['candidates', id, 'applications'],

  // Jobs keys
  jobs: ['jobs'],
  job: (id) => ['jobs', id],
  jobApplicants: (id) => ['jobs', id, 'applicants'],
  jobPerformance: (id) => ['jobs', id, 'performance'],
  jobTemplates: ['jobs', 'templates'],

  // Clients keys
  clients: ['clients'],
  client: (id) => ['clients', id],
  clientJobs: (id) => ['clients', id, 'jobs'],
  clientContracts: (id) => ['clients', id, 'contracts'],
  clientBilling: (id) => ['clients', id, 'billing'],

  // Analytics keys
  analytics: ['analytics'],
  dashboard: ['analytics', 'dashboard'],
  financial: ['analytics', 'financial'],
  performance: (type) => ['analytics', 'performance', type],
  realtime: ['analytics', 'realtime'],

  // Chat keys
  chat: ['chat'],
  conversations: ['chat', 'conversations'],
  messages: (conversationId) => ['chat', 'messages', conversationId],

  // Settings keys
  settings: ['settings'],

  // Search keys
  search: (type, query) => ['search', type, query],

  // With filters helper
  withFilters: (baseKey, filters) => [...baseKey, 'filtered', filters],

  // With pagination helper
  withPagination: (baseKey, page, limit) => [...baseKey, 'paginated', { page, limit }],
};

/**
 * Query invalidation helpers
 */
export const queryInvalidations = {
  // Invalidate all candidates data
  invalidateCandidates: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.candidates });
  },

  // Invalidate specific candidate
  invalidateCandidate: (id) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.candidate(id) });
  },

  // Invalidate all jobs data
  invalidateJobs: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
  },

  // Invalidate specific job
  invalidateJob: (id) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.job(id) });
  },

  // Invalidate all clients data
  invalidateClients: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.clients });
  },

  // Invalidate specific client
  invalidateClient: (id) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.client(id) });
  },

  // Invalidate all analytics
  invalidateAnalytics: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
  },

  // Invalidate dashboard specifically
  invalidateDashboard: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  },

  // Invalidate everything (use sparingly)
  invalidateAll: () => {
    queryClient.invalidateQueries();
  },
};

/**
 * Prefetching helpers
 */
export const queryPrefetch = {
  // Prefetch candidates list
  prefetchCandidates: (filters = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.withFilters(queryKeys.candidates, filters),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  },

  // Prefetch jobs list
  prefetchJobs: (filters = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.withFilters(queryKeys.jobs, filters),
      staleTime: 2 * 60 * 1000,
    });
  },

  // Prefetch dashboard data
  prefetchDashboard: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard,
      staleTime: 1 * 60 * 1000, // 1 minute for dashboard
    });
  },
};

/**
 * Optimistic update helpers
 */
export const optimisticUpdates = {
  // Update candidate in cache
  updateCandidateInCache: (id, updater) => {
    queryClient.setQueryData(queryKeys.candidate(id), updater);
  },

  // Update job in cache
  updateJobInCache: (id, updater) => {
    queryClient.setQueryData(queryKeys.job(id), updater);
  },

  // Add candidate to list cache
  addCandidateToCache: (candidate) => {
    queryClient.setQueryData(queryKeys.candidates, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: [candidate, ...oldData.data],
        total: oldData.total + 1,
      };
    });
  },

  // Remove candidate from cache
  removeCandidateFromCache: (id) => {
    queryClient.setQueryData(queryKeys.candidates, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: oldData.data.filter(candidate => candidate.id !== id),
        total: oldData.total - 1,
      };
    });
    queryClient.removeQueries({ queryKey: queryKeys.candidate(id) });
  },
};

/**
 * Query Provider Component
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Development tools */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginRight: '20px',
              marginBottom: '20px',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
}

// Export the query client for direct access when needed
export { queryClient };

export default QueryProvider;