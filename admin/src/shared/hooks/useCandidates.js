/**
 * Candidates Query Hooks
 * React Query hooks for all candidate-related operations
 */

import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { candidatesService } from '../services/api';
import { queryKeys, queryInvalidations, optimisticUpdates } from '../providers/QueryProvider';

/**
 * Hook to fetch all candidates with optional filtering and pagination
 */
export function useCandidates(params = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    ...filters
  } = params;

  const queryParams = {
    page,
    limit,
    ...(status && { status }),
    ...(search && { search }),
    sortBy,
    sortOrder,
    ...filters
  };

  return useQuery({
    queryKey: queryKeys.withFilters(queryKeys.candidates, queryParams),
    queryFn: () => candidatesService.getAll(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => ({
      candidates: data?.data?.candidates || data?.candidates || [],
      pagination: data?.pagination || {
        page,
        limit,
        total: data?.total || 0,
        totalPages: Math.ceil((data?.total || 0) / limit)
      },
      filters: data?.filters || {},
    }),
  });
}

/**
 * Hook for infinite loading/scrolling of candidates
 */
export function useCandidatesInfinite(params = {}) {
  const { limit = 20, ...filters } = params;

  return useInfiniteQuery({
    queryKey: queryKeys.withFilters(['candidates', 'infinite'], filters),
    queryFn: ({ pageParam = 1 }) =>
      candidatesService.getAll({ ...filters, page: pageParam, limit }),
    getNextPageParam: (lastPage, pages) => {
      const hasMore = lastPage?.pagination?.hasMore ||
                     (lastPage?.pagination?.page < lastPage?.pagination?.totalPages);
      return hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single candidate by ID
 */
export function useCandidate(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.candidate(id),
    queryFn: () => candidatesService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes for individual candidate
    ...options,
  });
}

/**
 * Hook to fetch candidate performance data
 */
export function useCandidatePerformance(id, params = {}) {
  return useQuery({
    queryKey: queryKeys.candidatePerformance(id),
    queryFn: () => candidatesService.getPerformance(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute for performance data
  });
}

/**
 * Hook to fetch candidate applications
 */
export function useCandidateApplications(id, params = {}) {
  return useQuery({
    queryKey: queryKeys.candidateApplications(id),
    queryFn: () => candidatesService.getApplications(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to create a new candidate
 */
export function useCreateCandidate() {
  return useMutation({
    mutationFn: (candidateData) => candidatesService.create(candidateData),
    onSuccess: (newCandidate) => {
      // Add to candidates list cache
      optimisticUpdates.addCandidateToCache(newCandidate);

      // Invalidate candidates list to refetch with updated data
      queryInvalidations.invalidateCandidates();
    },
    onError: (error) => {
      console.error('Failed to create candidate:', error);
    },
  });
}

/**
 * Hook to update an existing candidate
 */
export function useUpdateCandidate() {
  return useMutation({
    mutationFn: ({ id, ...candidateData }) =>
      candidatesService.update(id, candidateData),
    onMutate: async ({ id, ...candidateData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.candidate(id) });

      // Snapshot previous value
      const previousCandidate = queryClient.getQueryData(queryKeys.candidate(id));

      // Optimistically update
      optimisticUpdates.updateCandidateInCache(id, (old) => ({
        ...old,
        ...candidateData,
        updated_at: new Date().toISOString(),
      }));

      return { previousCandidate, candidateId: id };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCandidate) {
        queryClient.setQueryData(
          queryKeys.candidate(context.candidateId),
          context.previousCandidate
        );
      }
    },
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryInvalidations.invalidateCandidate(id);
      queryInvalidations.invalidateCandidates();
    },
  });
}

/**
 * Hook to update candidate status
 */
export function useUpdateCandidateStatus() {
  return useMutation({
    mutationFn: ({ id, status }) => candidatesService.updateStatus(id, status),
    onSuccess: (updatedCandidate, { id }) => {
      // Update the candidate in cache
      optimisticUpdates.updateCandidateInCache(id, () => updatedCandidate);

      // Invalidate related queries
      queryInvalidations.invalidateCandidate(id);
      queryInvalidations.invalidateCandidates();
    },
  });
}

/**
 * Hook to delete a candidate
 */
export function useDeleteCandidate() {
  return useMutation({
    mutationFn: (id) => candidatesService.delete(id),
    onSuccess: (data, id) => {
      // Remove from cache
      optimisticUpdates.removeCandidateFromCache(id);

      // Invalidate candidates list
      queryInvalidations.invalidateCandidates();
    },
  });
}

/**
 * Hook to add notes to a candidate
 */
export function useAddCandidateNote() {
  return useMutation({
    mutationFn: ({ id, noteData }) => candidatesService.addNote(id, noteData),
    onSuccess: (note, { id }) => {
      // Invalidate candidate data to refetch with new note
      queryInvalidations.invalidateCandidate(id);
    },
  });
}

/**
 * Hook to upload candidate documents
 */
export function useUploadCandidateDocuments() {
  return useMutation({
    mutationFn: ({ id, formData }) => candidatesService.uploadDocuments(id, formData),
    onSuccess: (result, { id }) => {
      // Invalidate candidate data to refetch with new documents
      queryInvalidations.invalidateCandidate(id);
    },
  });
}

/**
 * Hook to search candidates
 */
export function useSearchCandidates(searchParams, options = {}) {
  return useQuery({
    queryKey: queryKeys.search('candidates', searchParams),
    queryFn: () => candidatesService.search(searchParams),
    enabled: !!searchParams?.query || !!searchParams?.filters,
    staleTime: 30 * 1000, // 30 seconds for search results
    ...options,
  });
}

/**
 * Hook to get candidates analytics
 */
export function useCandidatesAnalytics(filters = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'candidates'], filters),
    queryFn: () => candidatesService.getAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes for analytics
  });
}

/**
 * Hook to bulk update candidates
 */
export function useBulkUpdateCandidates() {
  return useMutation({
    mutationFn: ({ candidateIds, updateData }) =>
      candidatesService.bulkUpdate(candidateIds, updateData),
    onSuccess: () => {
      // Invalidate all candidates data after bulk update
      queryInvalidations.invalidateCandidates();
    },
  });
}

/**
 * Hook to export candidates data
 */
export function useExportCandidates() {
  return useMutation({
    mutationFn: ({ filters, format }) =>
      candidatesService.exportData(filters, format),
    onSuccess: (blob, { filters, format }) => {
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidates_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

/**
 * Compound hook for candidate management
 */
export function useCandidateManagement(id) {
  const candidate = useCandidate(id);
  const performance = useCandidatePerformance(id);
  const applications = useCandidateApplications(id);

  const updateCandidate = useUpdateCandidate();
  const updateStatus = useUpdateCandidateStatus();
  const deleteCandidate = useDeleteCandidate();
  const addNote = useAddCandidateNote();
  const uploadDocuments = useUploadCandidateDocuments();

  return {
    // Data
    candidate,
    performance,
    applications,

    // Actions
    updateCandidate,
    updateStatus,
    deleteCandidate,
    addNote,
    uploadDocuments,

    // Computed states
    isLoading: candidate.isLoading || performance.isLoading || applications.isLoading,
    hasError: candidate.isError || performance.isError || applications.isError,
    isUpdating: updateCandidate.isPending || updateStatus.isPending,
  };
}