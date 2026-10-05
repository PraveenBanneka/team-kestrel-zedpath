// The test-notification path: native app (Capacitor) vs browser. Runs in Node with a stand-in for the native bridge.
import { afterEach, describe, expect, it } from 'vitest';
import { notificationsSupported, sendTestNotification } from './notify.ts';

type G = { Capacitor?: unknown };
afterEach(() => { delete (globalThis as G).Capacitor; });

function fakeNative(permission: string, grantOnRequest = true) {
  const scheduled: unknown[] = [];
  let display = permission;
  (globalThis as G).Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
    checkPermissions: async () => ({ display }),
    requestPermissions: async () => { if (grantOnRequest) display = 'granted'; return { display }; },
    schedule: async (o: { notifications: unknown[] }) => { scheduled.push(...o.notifications); return {}; },
  } } };
  return scheduled;
}

describe('test notification', () => {
  it('in the native app, asks permission once and posts exactly one native notification', async () => {
    const scheduled = fakeNative('prompt');
    expect(notificationsSupported()).toBe(true);
    expect(await sendTestNotification()).toEqual({ ok: true });
    expect(scheduled).toEqual([expect.objectContaining({ id: 1, title: 'ZedPath', smallIcon: 'ic_stat_zedpath' })]);
  });

  it('uses the same id every time, so a second tap replaces rather than adds', async () => {
    const scheduled = fakeNative('granted');
    await sendTestNotification(); await sendTestNotification();
    expect(new Set((scheduled as { id: number }[]).map(n => n.id)).size).toBe(1);
  });

  it('explains how to turn notifications on when the student says no', async () => {
    fakeNative('denied', false);
    const r = await sendTestNotification();
    expect(r.ok).toBe(false);
  });

  it('without the native app or a browser notification API, reports unsupported instead of failing', async () => {
    expect(notificationsSupported()).toBe(false);                     // Node: no Capacitor, no window
    expect((await sendTestNotification()).ok).toBe(false);
  });
});
