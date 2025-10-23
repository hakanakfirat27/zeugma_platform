// frontend/src/hooks/useChatWebSocket.js
// ENHANCED VERSION WITH AUTO MARK AS READ

import { useEffect, useRef, useState, useCallback } from 'react';

export const useChatWebSocket = (roomId, onMessage, onTyping, onUserStatus, onMessageRead) => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!roomId) return;

    try {
      const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsScheme}://${window.location.hostname}:8000/ws/chat/${roomId}/`;

      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'chat_message':
              onMessage?.(data.message);
              break;
            case 'typing_indicator':
              onTyping?.(data);
              break;
            case 'user_status':
              onUserStatus?.(data);
              break;
            case 'message_read':
              onMessageRead?.(data);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to establish connection');
    }
  }, [roomId, onMessage, onTyping, onUserStatus, onMessageRead]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket not connected');
    return false;
  }, []);

  const sendTyping = useCallback((isTyping) => {
    return sendMessage({
      type: 'typing',
      is_typing: isTyping
    });
  }, [sendMessage]);

  const markAsRead = useCallback((messageId) => {
    return sendMessage({
      type: 'mark_read',
      message_id: messageId
    });
  }, [sendMessage]);

  // Auto-mark messages as read when they arrive
  const autoMarkAsRead = useCallback((messageId, senderId, currentUserId) => {
    // Only mark as read if message is from someone else
    if (senderId !== currentUserId) {
      markAsRead(messageId);
    }
  }, [markAsRead]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return {
    isConnected,
    error,
    sendMessage,
    sendTyping,
    markAsRead,
    autoMarkAsRead,
    reconnect: connect
  };
};

export default useChatWebSocket;