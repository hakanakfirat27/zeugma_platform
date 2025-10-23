import { useState, useEffect } from 'react';
import api from '../utils/api';

export const useChatUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      // --- MODIFIED URL HERE ---
      const response = await api.get('/api/chat/rooms/unread_count/'); // Changed from '/api/chat/unread_count/'
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
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);

    return () => clearInterval(interval);
  }, []);

  return unreadCount;
};

export default useChatUnreadCount;