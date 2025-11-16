// frontend/src/hooks/useAnnouncementBadge.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Custom hook to track unread announcement count with real-time updates
 *
 * Usage in your sidebar/layout:
 * const unreadCount = useAnnouncementBadge();
 *
 * Then display the badge:
 * {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
 */
export const useAnnouncementBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/api/announcements/unread_count/');
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Don't show error to user, just fail silently for badge
    }
  }, []);

  useEffect(() => {
    // Fetch initial count
    fetchUnreadCount();

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchUnreadCount, 30000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Return the count and a refresh function
  return { unreadCount, refreshCount: fetchUnreadCount };
};

export default useAnnouncementBadge;