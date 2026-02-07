/**
 * React Query hooks for server-state management.
 *
 * Replaces raw fetch() calls in page components with cached,
 * deduped, auto-refetching queries via TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

// ─── Helpers ───────────────────────────────────────────────

const API_BASE = '/api/v1';

async function apiFetch(url) {
  const res = await fetch(`${API_BASE}${url}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
}

async function apiPost(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
}

// ─── Jobs ──────────────────────────────────────────────────

/** Fetch all open jobs */
export function useOpenJobs() {
  return useQuery({
    queryKey: ['jobs', 'open'],
    queryFn: () => apiFetch('/jobs?status=open'),
  });
}

/** Fetch candidate's deployments (applied/assigned jobs) */
export function useMyDeployments(candidateId) {
  return useQuery({
    queryKey: ['deployments', candidateId],
    queryFn: () => apiFetch(`/candidates/${candidateId}/deployments`),
    enabled: !!candidateId,
  });
}

// ─── Payments ──────────────────────────────────────────────

/** Fetch all payments for a candidate */
export function usePayments(candidateId) {
  return useQuery({
    queryKey: ['payments', candidateId],
    queryFn: () => apiFetch(`/payments?candidate_id=${candidateId}`),
    enabled: !!candidateId,
  });
}

// ─── Calendar / Availability ───────────────────────────────

/** Fetch candidate availability for the next N days */
export function useAvailability(candidateId, days = 90) {
  return useQuery({
    queryKey: ['availability', candidateId, days],
    queryFn: async () => {
      const data = await apiFetch(`/availability/${candidateId}?days=${days}`);
      return data?.availability || [];
    },
    enabled: !!candidateId,
  });
}

/** Fetch candidate availability mode (weekdays, weekends, custom, etc.) */
export function useAvailabilityMode(candidateId) {
  return useQuery({
    queryKey: ['availability-mode', candidateId],
    queryFn: () => apiFetch(`/candidates/${candidateId}/availability-mode`),
    enabled: !!candidateId,
  });
}

/** Save availability dates (POST mutation) */
export function useSaveAvailability(candidateId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dates) => apiPost(`/availability/${candidateId}`, { dates }),
    onSuccess: () => {
      // Invalidate both availability queries so they refetch
      queryClient.invalidateQueries({ queryKey: ['availability', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['availability-mode', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['deployments', candidateId] });
    },
  });
}
