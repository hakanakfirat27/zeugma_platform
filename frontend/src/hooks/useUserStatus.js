// frontend/src/hooks/useUserStatus.js
// Custom hook for real-time user online/offline status

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const useUserStatus = () => {
  const queryClient = useQueryClient();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    // ✅ FIXED: Determine correct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // In development: React runs on :5173, Django on :8000
    // In production: Both run on same host/port
    let wsUrl;
    if (window.location.port === '5173') {
      // Development mode - connect to Django server on port 8000
      wsUrl = `${protocol}//${window.location.hostname}:8000/ws/user-status/`;
    } else {
      // Production mode - use current host
      wsUrl = `${protocol}//${window.location.host}/ws/user-status/`;
    }

    console.log('🔌 Connecting to user status WebSocket:', wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ User status WebSocket connected');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 User status update received:', data);

          if (data.type === 'user_status') {
            const { user_id, is_online } = data;

            // Update the users query cache
            queryClient.setQueryData(['users'], (oldData) => {
              if (!oldData) return oldData;

              return {
                ...oldData,
                results: oldData.results.map(user =>
                  user.id === user_id
                    ? { ...user, is_online }
                    : user
                )
              };
            });

            // Also update any specific user queries
            queryClient.invalidateQueries(['user', user_id]);
          }
        } catch (error) {
          console.error('❌ Error parsing user status message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ User status WebSocket error:', error);
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 User status WebSocket closed:', event.code, event.reason);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
    }
  };

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return null; // This hook doesn't return anything, it just updates the cache
};

export default useUserStatus;