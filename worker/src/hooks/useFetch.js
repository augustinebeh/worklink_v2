import { useState, useEffect, useCallback } from 'react';

/**
 * Shared data fetching hook
 * Reduces boilerplate across all pages
 */
export function useFetch(url, options = {}) {
  const {
    enabled = true,
    initialData = null,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        onSuccess?.(json.data);
      } else {
        throw new Error(json.error || 'Request failed');
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [url, onSuccess, onError]);

  useEffect(() => {
    if (enabled && url) {
      fetchData();
    }
  }, [enabled, fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}

/**
 * Hook for POST/PUT/DELETE requests
 */
export function useMutation(url, options = {}) {
  const {
    method = 'POST',
    onSuccess,
    onError,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (body) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        onSuccess?.(json.data);
        return { success: true, data: json.data };
      } else {
        throw new Error(json.error || 'Request failed');
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [url, method, onSuccess, onError]);

  return { mutate, loading, error };
}
