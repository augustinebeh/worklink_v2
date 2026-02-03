/**
 * Jobs Query Hooks
 * React Query hooks for all job-related operations
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { jobsService } from '../services/api';
import { queryKeys, queryInvalidations } from '../providers/QueryProvider';

/**
 * Hook to fetch all jobs with optional filtering and pagination
 */
export function useJobs(params = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    clientId,
    ...filters
  } = params;

  const queryParams = {
    page,
    limit,
    ...(status && { status }),
    ...(search && { search }),
    ...(clientId && { clientId }),
    sortBy,
    sortOrder,
    ...filters
  };

  return useQuery({
    queryKey: queryKeys.withFilters(queryKeys.jobs, queryParams),
    queryFn: () => jobsService.getAll(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => ({
      jobs: data?.data?.jobs || data?.jobs || [],
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
 * Hook to fetch a single job by ID
 */
export function useJob(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => jobsService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch job applicants
 */
export function useJobApplicants(id, params = {}) {
  return useQuery({
    queryKey: queryKeys.jobApplicants(id),
    queryFn: () => jobsService.getApplicants(id, params),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute for applicants
  });
}

/**
 * Hook to fetch job performance metrics
 */
export function useJobPerformance(id, params = {}) {
  return useQuery({
    queryKey: queryKeys.jobPerformance(id),
    queryFn: () => jobsService.getPerformance(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch job templates
 */
export function useJobTemplates() {
  return useQuery({
    queryKey: queryKeys.jobTemplates,
    queryFn: () => jobsService.getTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes for templates
  });
}

/**
 * Hook to get matching candidates for a job
 */
export function useJobMatchingCandidates(id, params = {}) {
  return useQuery({
    queryKey: [...queryKeys.job(id), 'matching-candidates', params],
    queryFn: () => jobsService.getMatchingCandidates(id, params),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new job
 */
export function useCreateJob() {
  return useMutation({
    mutationFn: (jobData) => jobsService.create(jobData),
    onSuccess: (newJob) => {
      // Invalidate jobs list to include the new job
      queryInvalidations.invalidateJobs();

      // If the job has a client, invalidate client jobs too
      if (newJob.clientId) {
        queryInvalidations.invalidateClient(newJob.clientId);
      }
    },
  });
}

/**
 * Hook to update an existing job
 */
export function useUpdateJob() {
  return useMutation({
    mutationFn: ({ id, ...jobData }) => jobsService.update(id, jobData),
    onMutate: async ({ id, ...jobData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.job(id) });

      // Snapshot previous value
      const previousJob = queryClient.getQueryData(queryKeys.job(id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.job(id), (old) => ({
        ...old,
        ...jobData,
        updated_at: new Date().toISOString(),
      }));

      return { previousJob, jobId: id };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(queryKeys.job(context.jobId), context.previousJob);
      }
    },
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryInvalidations.invalidateJob(id);
      queryInvalidations.invalidateJobs();
    },
  });
}

/**
 * Hook to update job status
 */
export function useUpdateJobStatus() {
  return useMutation({
    mutationFn: ({ id, status }) => jobsService.updateStatus(id, status),
    onSuccess: (updatedJob, { id }) => {
      // Update the job in cache
      queryClient.setQueryData(queryKeys.job(id), updatedJob);

      // Invalidate related queries
      queryInvalidations.invalidateJob(id);
      queryInvalidations.invalidateJobs();
    },
  });
}

/**
 * Hook to delete a job
 */
export function useDeleteJob() {
  return useMutation({
    mutationFn: (id) => jobsService.delete(id),
    onSuccess: (data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.job(id) });

      // Invalidate jobs list
      queryInvalidations.invalidateJobs();
    },
  });
}

/**
 * Hook to add applicant to job
 */
export function useAddJobApplicant() {
  return useMutation({
    mutationFn: ({ jobId, candidateId, applicationData }) =>
      jobsService.addApplicant(jobId, candidateId, applicationData),
    onSuccess: (application, { jobId }) => {
      // Invalidate job applicants to refetch with new applicant
      queryInvalidations.invalidateJob(jobId);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobApplicants(jobId) });
    },
  });
}

/**
 * Hook to update applicant status
 */
export function useUpdateApplicantStatus() {
  return useMutation({
    mutationFn: ({ jobId, candidateId, status }) =>
      jobsService.updateApplicantStatus(jobId, candidateId, status),
    onSuccess: (application, { jobId, candidateId }) => {
      // Invalidate job applicants
      queryClient.invalidateQueries({ queryKey: queryKeys.jobApplicants(jobId) });

      // Also invalidate candidate applications
      queryClient.invalidateQueries({ queryKey: queryKeys.candidateApplications(candidateId) });
    },
  });
}

/**
 * Hook to create job from template
 */
export function useCreateJobFromTemplate() {
  return useMutation({
    mutationFn: ({ templateId, customData }) =>
      jobsService.createFromTemplate(templateId, customData),
    onSuccess: (newJob) => {
      queryInvalidations.invalidateJobs();
    },
  });
}

/**
 * Hook to clone an existing job
 */
export function useCloneJob() {
  return useMutation({
    mutationFn: ({ id, modifications }) => jobsService.clone(id, modifications),
    onSuccess: (clonedJob) => {
      queryInvalidations.invalidateJobs();
    },
  });
}

/**
 * Hook to search jobs
 */
export function useSearchJobs(searchParams, options = {}) {
  return useQuery({
    queryKey: queryKeys.search('jobs', searchParams),
    queryFn: () => jobsService.search(searchParams),
    enabled: !!searchParams?.query || !!searchParams?.filters,
    staleTime: 30 * 1000, // 30 seconds for search results
    ...options,
  });
}

/**
 * Hook to get jobs analytics
 */
export function useJobsAnalytics(filters = {}) {
  return useQuery({
    queryKey: queryKeys.withFilters(['analytics', 'jobs'], filters),
    queryFn: () => jobsService.getAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes for analytics
  });
}

/**
 * Hook to bulk update jobs
 */
export function useBulkUpdateJobs() {
  return useMutation({
    mutationFn: ({ jobIds, updateData }) => jobsService.bulkUpdate(jobIds, updateData),
    onSuccess: () => {
      queryInvalidations.invalidateJobs();
    },
  });
}

/**
 * Hook to export jobs data
 */
export function useExportJobs() {
  return useMutation({
    mutationFn: ({ filters, format }) => jobsService.exportData(filters, format),
    onSuccess: (blob, { format }) => {
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobs_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

/**
 * Hook to schedule job posting
 */
export function useScheduleJob() {
  return useMutation({
    mutationFn: ({ id, scheduleData }) => jobsService.schedule(id, scheduleData),
    onSuccess: (data, { id }) => {
      queryInvalidations.invalidateJob(id);
    },
  });
}

/**
 * Hook to get job posting preview
 */
export function useJobPreview(id, platform, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.job(id), 'preview', platform],
    queryFn: () => jobsService.getPreview(id, platform),
    enabled: !!id && !!platform,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Compound hook for job management
 */
export function useJobManagement(id) {
  const job = useJob(id);
  const applicants = useJobApplicants(id);
  const performance = useJobPerformance(id);
  const matchingCandidates = useJobMatchingCandidates(id);

  const updateJob = useUpdateJob();
  const updateStatus = useUpdateJobStatus();
  const deleteJob = useDeleteJob();
  const addApplicant = useAddJobApplicant();
  const updateApplicantStatus = useUpdateApplicantStatus();

  return {
    // Data
    job,
    applicants,
    performance,
    matchingCandidates,

    // Actions
    updateJob,
    updateStatus,
    deleteJob,
    addApplicant,
    updateApplicantStatus,

    // Computed states
    isLoading: job.isLoading || applicants.isLoading || performance.isLoading,
    hasError: job.isError || applicants.isError || performance.isError,
    isUpdating: updateJob.isPending || updateStatus.isPending,
  };
}