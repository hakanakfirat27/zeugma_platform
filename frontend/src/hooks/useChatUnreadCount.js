import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const useChatUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/api/chat/rooms/unread_count/');
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      // Avoid logging 404s if the endpoint simply doesn't exist for a user type
      if (error.response?.status !== 404) {
         console.error('Error fetching unread chat count:', error);
      } else {
         // Handle 404 gracefully, maybe user doesn't have chat access
         setUnreadCount(0);
      }
    }
  }, []);

  // Function to manually clear the count (for when user clicks Chat)
  const clearCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Function to manually refresh the count
  const refreshCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();

    // Connect to notification WebSocket for INSTANT updates
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    console.log('💬 Chat Badge: Connecting to notifications WebSocket');
    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => {
      console.log('✅ Chat Badge: WebSocket connected');
    };

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update chat badge INSTANTLY when message notification arrives
      if (data.type === 'notification' &&
          data.notification &&
          data.notification.notification_type === 'message') {
        console.log('💬 Chat Badge: Updating instantly!');
        fetchUnreadCount();
      }
    };

    notifWs.onerror = (error) => {
      console.error('❌ Chat Badge: WebSocket error:', error);
    };

    notifWs.onclose = () => {
      console.log('🔴 Chat Badge: WebSocket disconnected');
    };

    // No polling needed - WebSocket handles everything instantly!

    return () => {
      if (notifWs.readyState === WebSocket.OPEN) {
        notifWs.close();
      }
    };
  }, [fetchUnreadCount]);

  // Return count and helper functions
  return {
    unreadCount,
    clearCount,
    refreshCount
  };
};

export default useChatUnreadCount;