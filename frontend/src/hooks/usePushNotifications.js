// frontend/src/hooks/usePushNotifications.js
// Hook for managing Web Push notification subscriptions

import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// Convert base64 string to Uint8Array (needed for VAPID key)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = 
          'serviceWorker' in navigator && 
          'PushManager' in window &&
          'Notification' in window;
        
        console.log('[Push] Browser support check:', supported);
        setIsSupported(supported);
        
        if (supported) {
          setPermission(Notification.permission);
          
          // Only check subscription if service worker is already registered
          // Don't wait for serviceWorker.ready as it can hang indefinitely
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log('[Push] Existing SW registrations:', registrations.length);
          
          if (registrations.length > 0) {
            await checkSubscription();
          } else {
            console.log('[Push] No service worker registered yet');
          }
        }
      } catch (err) {
        console.error('[Push] Error during support check:', err);
        setError(err.message);
      } finally {
        // ALWAYS set loading to false
        setIsLoading(false);
        console.log('[Push] Initial check complete, isLoading set to false');
      }
    };

    checkSupport();
  }, []);

  // Check current subscription status
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      
      setSubscription(sub);
      setIsSubscribed(!!sub);
      
      return sub;
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError(err.message);
      return null;
    }
  };

  // Get VAPID public key from server
  const getVapidPublicKey = async () => {
    if (vapidPublicKey) return vapidPublicKey;
    
    try {
      const response = await api.get('/api/push/vapid-public-key/');
      const key = response.data.public_key;
      setVapidPublicKey(key);
      return key;
    } catch (err) {
      console.error('Error getting VAPID key:', err);
      setError('Push notifications not configured on server');
      return null;
    }
  };

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      throw err;
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.error('Error requesting permission:', err);
      throw err;
    }
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (deviceName = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check/request permission
      if (Notification.permission === 'default') {
        const result = await requestPermission();
        if (result !== 'granted') {
          throw new Error('Notification permission denied');
        }
      } else if (Notification.permission === 'denied') {
        throw new Error('Notification permission denied. Please enable it in browser settings.');
      }

      // Register service worker
      await registerServiceWorker();
      
      // Get VAPID public key
      const publicKey = await getVapidPublicKey();
      if (!publicKey) {
        throw new Error('Could not get VAPID public key');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      console.log('Push subscription created:', sub);
      
      // Send subscription to server
      const subscriptionJson = sub.toJSON();
      await api.post('/api/push/subscribe/', {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
        device_name: deviceName
      });
      
      setSubscription(sub);
      setIsSubscribed(true);
      
      return sub;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [vapidPublicKey]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!subscription) {
        throw new Error('No subscription to unsubscribe');
      }
      
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Tell server to remove subscription
      const subscriptionJson = subscription.toJSON();
      await api.post('/api/push/unsubscribe/', {
        endpoint: subscriptionJson.endpoint
      });
      
      setSubscription(null);
      setIsSubscribed(false);
      
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  // Send test notification
  const sendTestNotification = async () => {
    try {
      const response = await api.post('/api/push/test/');
      return response.data;
    } catch (err) {
      console.error('Error sending test notification:', err);
      throw err;
    }
  };

  // Get list of user's subscriptions
  const getSubscriptions = async () => {
    try {
      const response = await api.get('/api/push/subscriptions/');
      return response.data.subscriptions;
    } catch (err) {
      console.error('Error getting subscriptions:', err);
      throw err;
    }
  };

  // Delete a subscription
  const deleteSubscription = async (subscriptionId) => {
    try {
      await api.delete(`/api/push/subscriptions/${subscriptionId}/`);
      return true;
    } catch (err) {
      console.error('Error deleting subscription:', err);
      throw err;
    }
  };

  return {
    // State
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error,
    
    // Actions
    subscribe,
    unsubscribe,
    requestPermission,
    checkSubscription,
    sendTestNotification,
    getSubscriptions,
    deleteSubscription,
  };
};

export default usePushNotifications;
