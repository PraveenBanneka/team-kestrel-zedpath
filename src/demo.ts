// Demo mode for the Gate 3 recording (Praveen 2026-10-11): opening the app with ?demo=kasun prefills sign-up and
// About you with the sample student Kasun Perera, so the video shows the flow without minutes of typing. Off unless that
// link is used (safe default: every real student sees empty forms). Remembered on the phone (localStorage), so the installed app also gets it.
// The email and mobile are placeholders and are never contacted.
import type { ProfileInput } from '../shared/api.ts';
import type { Extras } from '../shared/account.ts';
import type { Contact } from '../shared/contact.ts';

const KEY = 'zedpath.demo';

export function demoOn(): boolean {
  try {
    if (/[?&#/]demo=kasun/i.test(location.href)) localStorage.setItem(KEY, '1');      // before or after the #
    return localStorage.getItem(KEY) === '1';
  } catch { return false; }                     // no browser storage (tests, private mode): demo stays off
}

export const DEMO_USERNAME = 'kasun_demo';
export const DEMO_PASSWORD = 'Kestrel@2026';
export const DEMO_CONTACT: Contact = { fullName: 'Kasun Perera', email: 'kasun.perera@example.com', mobile: '0771234567', birthDate: '2006-03-14' };
export const DEMO_PROFILE: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14200, al: { CMATH: 'B', PHY: 'C', CHEM: 'C' } };
export const DEMO_EXTRAS: Extras = {
  achievements: [{ id: 'demo1', activity: 'Sri Lanka Mathematics Olympiad', kind: 'COMPETITION', level: 'NATIONAL', place: 'SECOND', year: 2024 }],
  interests: ['Building apps', 'Maths'],
};
