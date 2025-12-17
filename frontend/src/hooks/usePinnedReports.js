// frontend/src/hooks/usePinnedReports.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Custom hook for managing pinned reports on dashboard
 */
const usePinnedReports = () => {
  const [pinnedReports, setPinnedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch pinned reports
  const fetchPinnedReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/client/pinned-reports/');
      setPinnedReports(response.data.results || []);
    } catch (err) {
      console.error('Error fetching pinned reports:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pin a report (accepts subscription's primary key ID)
  const pinReport = useCallback(async (subscriptionId) => {
    try {
      const response = await api.post('/api/client/pinned-reports/', {
        subscription_id: subscriptionId,
      });
      
      // Refresh list
      await fetchPinnedReports();
      
      return response.data;
    } catch (err) {
      console.error('Error pinning report:', err);
      throw err;
    }
  }, [fetchPinnedReports]);

  // Unpin a report
  const unpinReport = useCallback(async (pinId) => {
    try {
      await api.delete(`/api/client/pinned-reports/${pinId}/`);
      
      // Update local state
      setPinnedReports(prev => prev.filter(p => p.id !== pinId));
    } catch (err) {
      console.error('Error unpinning report:', err);
      throw err;
    }
  }, []);

  // Reorder pinned reports
  const reorderPinnedReports = useCallback(async (newOrder) => {
    try {
      await api.post('/api/client/pinned-reports/reorder/', {
        order: newOrder,
      });
      
      // Refresh list
      await fetchPinnedReports();
    } catch (err) {
      console.error('Error reordering pinned reports:', err);
      throw err;
    }
  }, [fetchPinnedReports]);

  // Check if a subscription is pinned (by subscription primary key ID)
  const isPinned = useCallback((subscriptionId) => {
    return pinnedReports.some(p => p.subscription_id === subscriptionId);
  }, [pinnedReports]);

  // Get pin ID for a subscription (by subscription primary key ID)
  const getPinId = useCallback((subscriptionId) => {
    const pin = pinnedReports.find(p => p.subscription_id === subscriptionId);
    return pin?.id || null;
  }, [pinnedReports]);

  // Initial fetch
  useEffect(() => {
    fetchPinnedReports();
  }, [fetchPinnedReports]);

  return {
    pinnedReports,
    loading,
    error,
    fetchPinnedReports,
    pinReport,
    unpinReport,
    reorderPinnedReports,
    isPinned,
    getPinId,
  };
};

export default usePinnedReports;
