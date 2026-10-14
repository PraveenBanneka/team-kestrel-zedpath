// Demo mode for the Gate 3 recording (Praveen 2026-10-11): opening the app with ?demo=kasun prefills sign-up and
// About you with the sample student Kasun Perera, so the video shows the flow without minutes of typing. Off unless that
// link is used (safe default: every real student sees empty forms). Remembered on the phone (localStorage), so the installed app also gets it.
// The email and mobile are placeholders and are never contacted.
export { DEMO_USERNAME, DEMO_PASSWORD, DEMO_CONTACT, DEMO_PROFILE, DEMO_EXTRAS } from '../shared/demo-data.ts';

const KEY = 'zedpath.demo';

export function demoOn(): boolean {
  try {
    if (/[?&#/]demo=kasun/i.test(location.href)) localStorage.setItem(KEY, '1');      // before or after the #
    return localStorage.getItem(KEY) === '1';
  } catch { return false; }                     // no browser storage (tests, private mode): demo stays off
}
