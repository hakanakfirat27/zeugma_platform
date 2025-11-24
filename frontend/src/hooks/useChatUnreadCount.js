import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const useChatUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    console.log('🔵 FETCHING chat unread count from API...');
    try {
      const response = await api.get('/api/chat/rooms/unread_count/');
      console.log('✅ API Response:', response.data);
      console.log('✅ Unread Count:', response.data.unread_count);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('❌ API ERROR:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      
      // Avoid logging 404s if the endpoint simply doesn't exist for a user type
      if (error.response?.status !== 404) {
         console.error('Error fetching unread chat count:', error);
      } else {
         // Handle 404 gracefully, maybe user doesn't have chat access
         console.warn('⚠️ Chat endpoint returned 404 - setting count to 0');
         setUnreadCount(0);
      }
    }
  }, []);

  // Function to manually clear the count (for when user clicks Chat)
  const clearCount = useCallback(() => {
    console.log('🔵 Clearing chat badge...');
    setUnreadCount(0);
  }, []);

  // Function to manually refresh the count
  const refreshCount = useCallback(() => {
    console.log('🔵 Manually refreshing chat count...');
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    console.log('🔵 useChatUnreadCount: Initializing...');
    fetchUnreadCount();

    // Connect to notification WebSocket for INSTANT updates
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const notifWsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/notifications/`;

    console.log('💬 Chat Badge: Connecting to notifications WebSocket:', notifWsUrl);
    const notifWs = new WebSocket(notifWsUrl);

    notifWs.onopen = () => {
      console.log('✅ Chat Badge: WebSocket connected');
    };

    notifWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Chat Badge: WebSocket message received:', data);

      // Update chat badge INSTANTLY when message notification arrives
      if (data.type === 'notification' &&
          data.notification &&
          data.notification.notification_type === 'message') {
        console.log('💬 Chat Badge: Message notification detected! Fetching count...');
        console.log('💬 Notification details:', data.notification);
        fetchUnreadCount();
      } else {
        console.log('ℹ️ Chat Badge: Non-message notification, ignoring');
      }
    };

    notifWs.onerror = (error) => {
      console.error('❌ Chat Badge: WebSocket error:', error);
    };

    notifWs.onclose = () => {
      console.log('🔴 Chat Badge: WebSocket disconnected');
    };

    return () => {
      console.log('🔵 useChatUnreadCount: Cleaning up...');
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
