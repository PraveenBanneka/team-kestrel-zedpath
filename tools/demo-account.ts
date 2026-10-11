// Creates the demo student account on a ZedPath server for the Gate 3 recording (Praveen 2026-10-11), using the same
// sign-up API and password stretching (shared/kdf.ts) as the app. Sample person; placeholder email and mobile.
// Run from the repo root:  node tools/demo-account.ts <base-url> <username> <password>
import { deriveKey } from '../shared/kdf.ts';
import { CONSENT_VERSION } from '../shared/contact.ts';

const [base, username, password] = process.argv.slice(2);
if (!base || !username || !password) throw new Error('usage: node tools/demo-account.ts <base-url> <username> <password>');
const post = (p: string, b: unknown) => fetch(`${base}/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(b) });
const { salt } = await (await post('/auth/salt', { username })).json() as { salt: string };
const r = await post('/auth/signup', {
  username, key: await deriveKey(password, salt), consent: CONSENT_VERSION,
  profile: { stream: 'PHYS', district: 'KUR', zE4: 14200, al: { CMATH: 'B', PHY: 'C', CHEM: 'C' } },
  extras: { achievements: [{ id: 'a1', activity: 'Sri Lanka Mathematics Olympiad', kind: 'COMPETITION', level: 'NATIONAL', place: 'SECOND', year: 2024 }], interests: ['Building apps', 'Maths'] },
  contact: { fullName: 'Kasun Perera', email: 'kasun.perera@example.com', mobile: '0771234567', birthDate: '2006-03-14' },
});
console.log(r.status, await r.text());
