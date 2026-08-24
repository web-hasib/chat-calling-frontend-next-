// Service Worker for Real-Time Calling & Web Push Notifications

const CACHE_NAME = 'callapp-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push events from background
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { body: event.data ? event.data.text() : 'New notification' };
    } catch {
      data = {};
    }
  }

  const isCall = data.type === 'INCOMING_CALL' || data.isCall;
  const title = data.title || (isCall ? `Incoming ${data.callType || 'Audio'} Call` : 'New Message');
  
  const options = {
    body: data.body || (isCall ? `${data.callerName || 'Someone'} is calling you...` : 'You have a new message'),
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: isCall ? 'incoming-call-alert' : `msg-${data.conversationId || Date.now()}`,
    renotify: true,
    requireInteraction: isCall ? true : false,
    vibrate: isCall ? [500, 250, 500, 250, 500, 250, 1000] : [200, 100, 200],
    data: {
      url: data.url || '/chat',
      conversationId: data.conversationId,
      callType: data.callType,
      isCall: isCall,
      fromUserId: data.fromUserId,
      ...data,
    },
    actions: isCall
      ? [
          { action: 'accept', title: '📞 Answer' },
          { action: 'decline', title: '❌ Decline' },
        ]
      : [
          { action: 'open', title: '💬 View' }
        ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle interactive Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  const targetUrl = data.conversationId
    ? `/chat/${data.conversationId}${action === 'accept' ? '?action=accept-call' : ''}`
    : data.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If action is decline, inform active client windows
      if (action === 'decline') {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_CALL_DECLINED',
            conversationId: data.conversationId,
            fromUserId: data.fromUserId,
          });
        });
        return;
      }

      // Check if there is already an open window to focus
      for (const client of windowClients) {
        if (client.url.includes('/chat') && 'focus' in client) {
          if (action === 'accept') {
            client.postMessage({
              type: 'PUSH_CALL_ACCEPTED',
              conversationId: data.conversationId,
              fromUserId: data.fromUserId,
            });
          }
          return client.focus();
        }
      }

      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
