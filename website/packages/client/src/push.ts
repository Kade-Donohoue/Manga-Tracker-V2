import { usePushNotificationsSetting } from './components/settings/notification';
import { getOrCreateDeviceId } from './utils';

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  return await navigator.serviceWorker.register('/sw.js');
}

export async function ensurePushSubscription() {
  const deviceId = getOrCreateDeviceId();
  console.log(`Registering for notifs on ${deviceId}`);
  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  if (!usePushNotificationsSetting) return null;

  const permission = Notification.permission;

  if (permission !== 'granted') {
    return null;
  }

  let subscription = await registration.pushManager.getSubscription();
  console.log(subscription);

  if (!subscription) {
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    console.log(`Generating Sub with vapid key ${vapidPublicKey}`);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  console.log(subscription);

  await fetch(`/api/notifs/subscribe/${deviceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription),
  });

  return subscription;
}

export async function unsubscribeFromPush(id: string) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;

  await subscription.unsubscribe();

  await fetch(`/api/notifs/unsubscribe/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function sendTestNotification(id: string) {
  await fetch(`/api/notifs/send/${id}`, {
    method: 'POST',
    credentials: 'include',
  });
}
