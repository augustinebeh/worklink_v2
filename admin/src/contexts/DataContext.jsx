import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DataContext = createContext(null);

const API_BASE = '/api/v1';

export function DataProvider({ children }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [clients, setClients] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  // Generic fetch helper
  const fetchData = useCallback(async (endpoint, setter, key) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    setError(null);
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) throw new Error(`Failed to fetch ${key}`);
      const data = await response.json();
      setter(data.data || data);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${key}:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  // Load initial data
  const loadCandidates = useCallback(() => fetchData('/candidates', setCandidates, 'candidates'), [fetchData]);
  const loadJobs = useCallback(() => fetchData('/jobs', setJobs, 'jobs'), [fetchData]);
  const loadPayments = useCallback(() => fetchData('/payments', setPayments, 'payments'), [fetchData]);
  const loadTenders = useCallback(() => fetchData('/bpo/tenders', setTenders, 'tenders'), [fetchData]);
  const loadClients = useCallback(() => fetchData('/clients', setClients, 'clients'), [fetchData]);
  const loadAnalytics = useCallback(() => fetchData('/analytics/dashboard', setAnalytics, 'analytics'), [fetchData]);

  // CRUD operations for candidates
  const createCandidate = async (candidateData) => {
    const response = await fetch(`${API_BASE}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateData),
    });
    const data = await response.json();
    if (data.success) {
      setCandidates(prev => [...prev, data.candidate]);
    }
    return data;
  };

  const updateCandidate = async (id, updates) => {
    const response = await fetch(`${API_BASE}/candidates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (data.success) {
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
    return data;
  };

  // CRUD operations for jobs
  const createJob = async (jobData) => {
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    });
    const data = await response.json();
    if (data.success) {
      setJobs(prev => [...prev, data.job]);
    }
    return data;
  };

  const updateJob = async (id, updates) => {
    const response = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (data.success) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    }
    return data;
  };

  // Payment operations
  const updatePaymentStatus = async (id, status) => {
    const response = await fetch(`${API_BASE}/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (data.success) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    }
    return data;
  };

  // Tender operations
  const updateTenderStatus = async (id, status, notes) => {
    const response = await fetch(`${API_BASE}/bpo/tenders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const data = await response.json();
    if (data.success) {
      setTenders(prev => prev.map(t => t.id === id ? { ...t, status, notes } : t));
    }
    return data;
  };

  // Refresh all data
  const refreshAll = useCallback(() => {
    loadCandidates();
    loadJobs();
    loadPayments();
    loadTenders();
    loadClients();
    loadAnalytics();
  }, [loadCandidates, loadJobs, loadPayments, loadTenders, loadClients, loadAnalytics]);

  const value = {
    // Data
    candidates,
    jobs,
    payments,
    tenders,
    clients,
    analytics,
    
    // Loading states
    loading,
    error,
    
    // Load functions
    loadCandidates,
    loadJobs,
    loadPayments,
    loadTenders,
    loadClients,
    loadAnalytics,
    refreshAll,
    
    // CRUD operations
    createCandidate,
    updateCandidate,
    createJob,
    updateJob,
    updatePaymentStatus,
    updateTenderStatus,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
