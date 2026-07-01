const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Converts a base64 URL-encoded string to a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Register service worker and subscribe to push notifications
 */
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported')
    return false
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered')

    // Get VAPID public key from backend
    const res = await fetch(`${API_BASE}/api/push/vapid-key`)
    const { key } = await res.json()

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })

    // Send subscription to backend
    const token = localStorage.getItem('token')
    await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    })

    console.log('Push subscription saved')
    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

/**
 * Check if already subscribed
 */
export async function isSubscribed() {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

/**
 * Request notification permission and subscribe
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'

  if (Notification.permission === 'granted') {
    await subscribeToPush()
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const result = await Notification.requestPermission()
  if (result === 'granted') {
    await subscribeToPush()
  }
  return result
}
