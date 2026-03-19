import { useState, useEffect, useMemo } from 'react';
import {
  BriefcaseIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton, EmptyState } from '../components/common';
import { useOpenJobs, useMyDeployments } from '../hooks/useQueries';
import WorkerJobCard from './WorkerJobCard';
import WorkerJobFilters, { PendingAccountOverlay, Pagination } from './WorkerJobFilters';

export default function Jobs() {
  const { user, refreshUser } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;

  // React Query -- cached, deduped, auto-refetching
  const { data: jobs = [], isLoading: jobsLoading } = useOpenJobs();
  const { data: deploymentsRaw = [], isLoading: deploymentsLoading } = useMyDeployments(user?.id);
  const loading = jobsLoading || deploymentsLoading;

  // Derive applied job IDs from deployments
  const myJobs = useMemo(() => deploymentsRaw.map(d => d.job_id), [deploymentsRaw]);

  // Check if user is pending (excluding 'lead' status)
  const isPending = user?.status === 'pending';

  useEffect(() => {
    // Refresh user data to get latest status from server
    if (user) {
      refreshUser();
    }
  }, []);

  const filteredJobs = jobs.filter(job => {
    if (search) {
      const query = search.toLowerCase();
      if (!job.title.toLowerCase().includes(query) &&
          !job.location?.toLowerCase().includes(query) &&
          !job.company_name?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filter === 'applied') return myJobs.includes(job.id);
    if (filter === 'available') return !myJobs.includes(job.id);
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (a.featured !== b.featured) return b.featured - a.featured;
    return new Date(a.job_date) - new Date(b.job_date);
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / jobsPerPage);
  const paginatedJobs = sortedJobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Pending Account Overlay */}
      {isPending && <PendingAccountOverlay />}

      {/* Header & Filters */}
      <WorkerJobFilters
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        totalJobCount={jobs.length}
        availableCount={jobs.filter(j => !myJobs.includes(j.id)).length}
        appliedCount={myJobs.length}
        sortedJobCount={sortedJobs.length}
      />

      {/* Jobs List */}
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={4} height="h-32" />
        ) : paginatedJobs.length === 0 ? (
          <EmptyState
            icon={BriefcaseIcon}
            title="No jobs found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <>
            <div className="space-y-3">
              {paginatedJobs.map(job => (
                <WorkerJobCard key={job.id} job={job} applied={myJobs.includes(job.id)} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
