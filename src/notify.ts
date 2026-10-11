// Notifications: the test notification and Journey reminders (CR-002, FR-405).
// - Inside the native Android app (Capacitor), the app posts a real native notification through its
//   LocalNotifications plugin: ZedPath's own name and icon, no website line.
// - In a browser or the installed PWA, it is shown through the service worker.
// Either way, exactly one: a fixed id/tag means a second tap replaces the notification instead of adding one.

import { t } from './i18n/index.ts';

export type TestResult = { ok: true } | { ok: false; reason: string };
const TEST_TAG = 'zedpath-test';
const TEST_ID = 1;
const TITLE = 'ZedPath';
const BODY = 'Test notification: deadline reminders will look like this.';
const off = () => t('jr.notifOff');

interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(o: { notifications: { id: number; title: string; body: string; smallIcon?: string; iconColor?: string; extra?: unknown;
    isExactNotification?: boolean; schedule?: { at: Date } }[] }): Promise<unknown>;
  cancel(o: { notifications: { id: number }[] }): Promise<unknown>;
}
interface CapacitorGlobal { isNativePlatform(): boolean; Plugins: { LocalNotifications?: LocalNotificationsPlugin } }

/** The native app injects `window.Capacitor`; a browser never has it. */
function nativeNotifications(): LocalNotificationsPlugin | null {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() && cap.Plugins.LocalNotifications ? cap.Plugins.LocalNotifications : null;
}

export const notificationsSupported = () => nativeNotifications() !== null
  || (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator);

/** Phone reminders are only possible inside the native app; a browser gets the calendar file instead (FR-404). */
export const canScheduleReminders = () => nativeNotifications() !== null;

export interface Reminder { id: number; title: string; body: string; at: Date }
/** Replaces every Journey reminder on this phone with `reminders` (old ids cancelled first, so a change never doubles
 *  a reminder). Returns the ids now scheduled, or the reason it could not. */
export async function replaceReminders(previous: number[], reminders: Reminder[]): Promise<{ ok: true; ids: number[] } | { ok: false; reason: string }> {
  const native = nativeNotifications();
  if (!native) return { ok: false, reason: t('jr.noNative') };
  if (reminders.length) {
    let { display } = await native.checkPermissions();
    if (display !== 'granted') ({ display } = await native.requestPermissions());
    if (display !== 'granted') return { ok: false, reason: off() };
  }
  if (previous.length) await native.cancel({ notifications: previous.map(id => ({ id })) });
  if (reminders.length) await native.schedule({ notifications: reminders.map(r => ({ id: r.id, title: r.title, body: r.body,
    smallIcon: 'ic_stat_zedpath', iconColor: '#24478C', extra: { url: '/#/journey' }, isExactNotification: false,
    schedule: { at: r.at } })) });              // inexact: a reminder a few minutes late is fine, and needs no alarm permission
  return { ok: true, ids: reminders.map(r => r.id) };
}

/** Asks permission if needed, then shows exactly one notification. */
export async function sendTestNotification(): Promise<TestResult> {
  const native = nativeNotifications();
  if (native) {
    let { display } = await native.checkPermissions();
    if (display !== 'granted') ({ display } = await native.requestPermissions());
    if (display !== 'granted') return { ok: false, reason: off() };
    // isExactNotification: false - the plugin otherwise treats every notification as an exact alarm and opens Android's
    // "Alarms and reminders" settings to ask for that access (Praveen hit this on 1.1.0). ZedPath never needs exact alarms.
    await native.schedule({ notifications: [{ id: TEST_ID, title: TITLE, body: BODY, smallIcon: 'ic_stat_zedpath', iconColor: '#24478C',
      extra: { url: '/#/me' }, isExactNotification: false }] });
    return { ok: true };
  }
  if (!notificationsSupported()) return { ok: false, reason: 'This browser cannot show notifications.' };
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: off() };
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(r => setTimeout(() => r(null), 4000)),
  ]);
  if (!reg) return { ok: false, reason: 'The app is still starting. Try again in a moment.' };
  await reg.showNotification(TITLE, { body: BODY, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', tag: TEST_TAG, data: { url: '/#/me' } });
  return { ok: true };
}
