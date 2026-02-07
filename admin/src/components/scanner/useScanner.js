import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useScanner Hook
 * Centralizes all scanner state, data-fetching, and action handlers.
 * Consumed by TenderScanner page and its sub-tab components.
 */
export default function useScanner(toast) {
  const [activeTab, setActiveTab] = useState('feed');
  const [loading, setLoading] = useState(false);

  // Feed state
  const [feedTenders, setFeedTenders] = useState([]);
  const [feedSearch, setFeedSearch] = useState('');
  const [feedFilter, setFeedFilter] = useState('all');
  const [feedStats, setFeedStats] = useState({ open: 0, dismissed: 0, added: 0 });

  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newAlertKeyword, setNewAlertKeyword] = useState('');
  const [newAlertSource, setNewAlertSource] = useState('gebiz');

  // Scraper state
  const [scraperStatus, setScraperStatus] = useState(null);
  const [scraperLogs, setScraperLogs] = useState([]);

  // Matches
  const [unreadCount, setUnreadCount] = useState(0);

  // Portals state
  const [portals, setPortals] = useState([]);
  const [portalsLoading, setPortalsLoading] = useState(false);

  // Categories state
  const [categories, setCategories] = useState([]);
  const [enabledCategories, setEnabledCategories] = useState([]);
  const enabledCategoriesRef = useRef([]);

  // --- Data Fetching ---

  const fetchFeedStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scanner/feed/stats');
      const data = await res.json();
      if (data.success && data.data) {
        setFeedStats({
          open: data.data.totalOpen || 0,
          dismissed: data.data.totalDismissed || 0,
          added: data.data.totalInPipeline || 0
        });
      }
    } catch (err) {
      console.error('Error fetching feed stats:', err);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scanner/matches/unread');
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread matches:', err);
    }
  }, []);

  const fetchScraperStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scanner/scraper/status');
      const data = await res.json();
      if (data.success) {
        setScraperStatus(data.data || null);
      }
    } catch (err) {
      console.error('Error fetching scraper status:', err);
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (feedSearch) params.append('search', feedSearch);
      if (feedFilter !== 'all') params.append('status', feedFilter);
      const res = await fetch(`/api/v1/scanner/feed?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeedTenders(data.data?.tenders || []);
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      toast.error('Feed Error', 'Failed to load tender feed');
    } finally {
      setLoading(false);
    }
  }, [feedSearch, feedFilter, toast]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/scanner/alerts');
      const data = await res.json();
      if (data.success) {
        const mapped = (data.data || []).map(a => ({
          ...a,
          status: a.active ? 'active' : 'paused',
          unread: a.unread_count || 0
        }));
        setAlerts(mapped);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      toast.error('Alerts Error', 'Failed to load keyword alerts');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchScraperLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/scanner/scraper/logs');
      const data = await res.json();
      if (data.success) {
        setScraperLogs(data.data?.logs || []);
      }
    } catch (err) {
      console.error('Error fetching scraper logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPortals = useCallback(async () => {
    setPortalsLoading(true);
    try {
      const res = await fetch('/api/v1/scanner/portals');
      const data = await res.json();
      if (data.success) {
        setPortals(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching portals:', err);
    } finally {
      setPortalsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scanner/settings/categories');
      const data = await res.json();
      if (data.success) {
        const enabled = data.data?.enabled || [];
        setCategories(data.data?.available || []);
        setEnabledCategories(enabled);
        enabledCategoriesRef.current = enabled;
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // --- Actions ---

  const handleAddToPipeline = useCallback(async (tender) => {
    setFeedTenders((prev) => prev.filter((t) => t.id !== tender.id));
    try {
      const res = await fetch('/api/v1/pipeline/from-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_tender_id: tender.id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Added to Pipeline', `"${tender.title}" moved to pipeline`);
        fetchFeedStats();
      } else {
        setFeedTenders((prev) => [...prev, tender]);
        toast.error('Pipeline Error', data.message || data.error || 'Failed to add tender');
      }
    } catch (err) {
      setFeedTenders((prev) => [...prev, tender]);
      toast.error('Pipeline Error', 'Network error adding to pipeline');
    }
  }, [toast, fetchFeedStats]);

  const handleDismiss = useCallback(async (tenderId) => {
    setFeedTenders((prev) => prev.filter((t) => t.id !== tenderId));
    try {
      const res = await fetch(`/api/v1/scanner/feed/${tenderId}/dismiss`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Dismissed', 'Tender removed from feed');
        fetchFeedStats();
      } else {
        fetchFeed();
        toast.error('Dismiss Error', data.message || 'Failed to dismiss');
      }
    } catch (err) {
      fetchFeed();
      toast.error('Dismiss Error', 'Network error dismissing tender');
    }
  }, [toast, fetchFeedStats, fetchFeed]);

  const handleCreateAlert = useCallback(async () => {
    if (!newAlertKeyword.trim()) return;
    try {
      const res = await fetch('/api/v1/scanner/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newAlertKeyword.trim(), source: newAlertSource })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Alert Created', `Watching for "${newAlertKeyword.trim()}"`);
        setNewAlertKeyword('');
        setShowNewAlert(false);
        fetchAlerts();
      } else {
        toast.error('Alert Error', data.message || 'Failed to create alert');
      }
    } catch (err) {
      toast.error('Alert Error', 'Network error creating alert');
    }
  }, [newAlertKeyword, newAlertSource, toast, fetchAlerts]);

  const handleToggleAlert = useCallback(async (alertId, currentStatus) => {
    const newActive = currentStatus !== 'active';
    const newStatus = newActive ? 'active' : 'paused';
    try {
      const res = await fetch(`/api/v1/scanner/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive })
      });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: newStatus, active: newActive ? 1 : 0 } : a))
        );
      } else {
        toast.error('Toggle Error', data.message || 'Failed to toggle alert');
      }
    } catch (err) {
      toast.error('Toggle Error', 'Network error toggling alert');
    }
  }, [toast]);

  const handleDeleteAlert = useCallback(async (alertId) => {
    try {
      const res = await fetch(`/api/v1/scanner/alerts/${alertId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        toast.success('Deleted', 'Alert removed');
      } else {
        toast.error('Delete Error', data.message || 'Failed to delete alert');
      }
    } catch (err) {
      toast.error('Delete Error', 'Network error deleting alert');
    }
  }, [toast]);

  const handleScraperAction = useCallback(async (action) => {
    try {
      let res;
      if (action === 'trigger') {
        res = await fetch('/api/v1/scanner/scraper/trigger', { method: 'POST' });
      } else {
        res = await fetch(`/api/v1/scanner/scraper/scheduler/${action}`, { method: 'POST' });
      }
      const data = await res.json();
      if (data.success) {
        toast.success('Scraper', `Action "${action}" executed successfully`);
        fetchScraperStatus();
        fetchScraperLogs();
      } else {
        toast.error('Scraper Error', data.message || `Failed to ${action}`);
      }
    } catch (err) {
      toast.error('Scraper Error', `Network error: ${action}`);
    }
  }, [toast, fetchScraperStatus, fetchScraperLogs]);

  const handleMarkRead = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scanner/matches/mark-read', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(0);
        toast.success('Matches', 'All matches marked as read');
      }
    } catch (err) {
      toast.error('Error', 'Failed to mark matches as read');
    }
  }, [toast]);

  const handleTogglePortal = useCallback(async (portalKey, currentEnabled) => {
    try {
      const res = await fetch(`/api/v1/scanner/portals/${portalKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      const data = await res.json();
      if (data.success) {
        setPortals((prev) =>
          prev.map((p) => (p.portal_key === portalKey ? data.data : p))
        );
        toast.success('Portal Updated', `${data.data.name} ${data.data.enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Portal Error', data.error || 'Failed to toggle portal');
      }
    } catch (err) {
      toast.error('Portal Error', 'Network error toggling portal');
    }
  }, [toast]);

  const handleToggleCategory = useCallback(async (categoryKey) => {
    // Use ref to always get the latest enabled list (avoids stale closure)
    const current = enabledCategoriesRef.current;
    const newEnabled = current.includes(categoryKey)
      ? current.filter(c => c !== categoryKey)
      : [...current, categoryKey];

    // Optimistic update (state + ref)
    enabledCategoriesRef.current = newEnabled;
    setEnabledCategories(newEnabled);
    setCategories(prev => prev.map(c => ({
      ...c,
      enabled: newEnabled.includes(c.key)
    })));

    try {
      const res = await fetch('/api/v1/scanner/settings/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newEnabled })
      });
      const data = await res.json();
      if (data.success) {
        const enabled = data.data?.enabled || [];
        setCategories(data.data?.available || []);
        setEnabledCategories(enabled);
        enabledCategoriesRef.current = enabled;
        fetchFeed();
      } else {
        fetchCategories();
        toast.error('Category Error', data.error || 'Failed to update categories');
      }
    } catch (err) {
      fetchCategories();
      toast.error('Category Error', 'Network error updating categories');
    }
  }, [toast, fetchFeed, fetchCategories]);

  // --- Effects ---

  // Initial load
  useEffect(() => {
    fetchFeedStats();
    fetchUnreadCount();
    fetchScraperStatus();
    fetchPortals();
    fetchCategories();
  }, [fetchFeedStats, fetchUnreadCount, fetchScraperStatus, fetchPortals, fetchCategories]);

  // Tab-specific loading
  useEffect(() => {
    if (activeTab === 'feed') fetchFeed();
    else if (activeTab === 'alerts') fetchAlerts();
    else if (activeTab === 'scraper') {
      fetchScraperStatus();
      fetchScraperLogs();
    } else if (activeTab === 'portals') {
      fetchPortals();
      fetchCategories();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced feed search
  useEffect(() => {
    if (activeTab !== 'feed') return;
    const timer = setTimeout(() => fetchFeed(), 400);
    return () => clearTimeout(timer);
  }, [feedSearch, feedFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Computed ---

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;
  const scraperRunning = scraperStatus?.scheduler?.isRunning ?? false;
  const activePortals = portals.filter(p => p.enabled && p.scraper_available);

  const refreshAll = useCallback(() => {
    fetchFeedStats();
    fetchUnreadCount();
    fetchScraperStatus();
    fetchPortals();
    if (activeTab === 'feed') fetchFeed();
    else if (activeTab === 'alerts') fetchAlerts();
    else if (activeTab === 'scraper') fetchScraperLogs();
  }, [activeTab, fetchFeedStats, fetchUnreadCount, fetchScraperStatus, fetchPortals, fetchFeed, fetchAlerts, fetchScraperLogs]);

  return {
    // Tab
    activeTab, setActiveTab,
    loading,

    // Feed
    feedTenders, feedSearch, setFeedSearch, feedFilter, setFeedFilter, feedStats,
    handleAddToPipeline, handleDismiss,

    // Alerts
    alerts, showNewAlert, setShowNewAlert, newAlertKeyword, setNewAlertKeyword,
    newAlertSource, setNewAlertSource,
    handleCreateAlert, handleToggleAlert, handleDeleteAlert,

    // Scraper
    scraperStatus, scraperLogs,
    handleScraperAction,

    // Matches
    unreadCount, handleMarkRead,

    // Portals
    portals, portalsLoading, activePortals,
    handleTogglePortal,

    // Categories
    categories, enabledCategories,
    handleToggleCategory,

    // Computed
    activeAlertCount, scraperRunning,

    // Refresh
    refreshAll
  };
}
