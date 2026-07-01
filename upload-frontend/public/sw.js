// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  let data = { title: 'WC26 Predictor', body: 'New notification' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/wc26-icon.png',
    badge: '/wc26-icon.png',
    vibrate: [200, 100, 200],
    tag: 'wc26-match-reminder',
    renotify: true,
    actions: [
      { action: 'predict', title: 'Predict Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'predict' || !event.action) {
    event.waitUntil(
      clients.openWindow('/fixtures')
    )
  }
})
