// self.addEventListener('push', event => {
//   if (!event.data) return;

//   let payload = {};
//   try {
//     payload = event.data.json();
//   } catch {
//     payload.body = event.data.text();
//   }

//   const title = payload.title || 'Tomari, New Manga!';
//   const options = {
//     body: payload.body || 'New content available!',
//     icon: '/icons/icon-192.png',
//     data: payload.data || {},
//   };

//   let count = parseInt(localStorage.getItem('unreadCount') || '0', 10);
//   count += 1;
//   localStorage.setItem('unreadCount', count);

//   event.waitUntil(self.registration.showNotification(title, options));

//   if ('setAppBadge' in navigator) {
//   const count = parseInt(localStorage.getItem('unreadCount') || '0', 10);
//     navigator.setAppBadge(count).catch(e => console.log('Badge error', e));
//   }
// });

self.addEventListener('install', event => {
  console.log('[SW] Installing');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  console.log('[SW] Push received', event);

  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    console.warn('[SW] Push event has no valid JSON', e);
  }

  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new message',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
  console.log('[SW] Active clients:', clients.map(c => c.url));
});