// Notifications (test only for now; deadline reminders will use the same path). Shown through the service worker,
// which is what Android needs: in the installed Android app (TWA) Chrome hands them to the app, so they appear as
// native ZedPath notifications with the app's name and icon.

export type TestResult = { ok: true } | { ok: false; reason: string };
const TEST_TAG = 'zedpath-test';      // a fixed tag: a second tap replaces the notification instead of adding one

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

/** Asks permission if needed, then shows exactly one notification. */
export async function sendTestNotification(): Promise<TestResult> {
  if (!notificationsSupported()) return { ok: false, reason: 'This browser cannot show notifications.' };
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'Notifications are turned off for ZedPath. Turn them on in your phone settings, then try again.' };
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(r => setTimeout(() => r(null), 4000)),
  ]);
  if (!reg) return { ok: false, reason: 'The app is still starting. Try again in a moment.' };
  await reg.showNotification('ZedPath', {
    body: 'Test notification: deadline reminders will look like this.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: TEST_TAG,
    data: { url: '/#/me' },
  });
  return { ok: true };
}
