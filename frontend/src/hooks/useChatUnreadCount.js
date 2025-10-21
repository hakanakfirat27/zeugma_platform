// frontend/src/hooks/useChatUnreadCount.js

import { useState, useEffect } from 'react';
import api from '../utils/api';

export const useChatUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/chat/unread_count/');
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread chat count:', error);
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