// public/sw.js - Service Worker for Push Notifications

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  // Activate immediately
  self.skipWaiting();
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// ============================================
// PUSH EVENT - Handle incoming push notifications
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Zeugma Notification',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/badge72.png',
    tag: 'default',
    url: '/',
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        url: payload.url || data.url,
        notification_type: payload.notification_type || 'system',
        timestamp: payload.timestamp || Date.now(),
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  // Notification options
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: {
      url: data.url,
      notification_type: data.notification_type,
      timestamp: data.timestamp,
    },
    // Visual options
    vibrate: [100, 50, 100],
    requireInteraction: true, // Keep notification visible until user interacts
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============================================
// NOTIFICATION CLICK EVENT
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Get the action
  const action = event.action;
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';

  if (action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the URL and focus
            client.navigate(url);
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// ============================================
// NOTIFICATION CLOSE EVENT
// ============================================
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  // You could track dismissed notifications here
});

// ============================================
// MESSAGE EVENT - Communication with main app
// ============================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// PUSH SUBSCRIPTION CHANGE
// ============================================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  // Re-subscribe with the same options
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('[SW] Re-subscribed after change');
        // You could send this to your server here
      })
      .catch((err) => {
        console.error('[SW] Failed to re-subscribe:', err);
      })
  );
});
