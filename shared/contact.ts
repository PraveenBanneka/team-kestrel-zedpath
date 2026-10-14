// Contact details, compulsory at sign-up (CR-003). The rules the phone and the server both validate against, so a
// form error shows on the phone and the server still refuses anything the phone let through. Mirrors the CHECKs in
// migration 0007 (a test pins them together).

export const CONSENT_VERSION = '2026-10-11';
export const NAME_MAX = 80;
export interface Contact { fullName: string; email: string; mobile: string; birthDate: string }
export type ContactField = keyof Contact | 'consent';

/** "071 234 5678", "0712345678", "+94 71 234 5678", "94712345678" -> "+94712345678"; null if not a Sri Lankan mobile. */
export function normaliseMobile(raw: string): string | null {
  const d = raw.replace(/[\s()-]/g, '');
  const m = d.match(/^(?:\+94|0094|94|0)(7\d{8})$/);
  return m ? `+94${m[1]}` : null;
}
export const normaliseEmail = (raw: string) => raw.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whole years on `today` for someone born on `birthDate` (both YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [y, m, d] = birthDate.split('-').map(Number), [Y, M, D] = today.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}
const realDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** Validates and normalises. `today` = YYYY-MM-DD. Ages 13 to 70: A/L students, repeaters and mature candidates. */
export function parseContact(x: unknown, consent: unknown, today: string): { ok: true; contact: Contact } | { ok: false; field: ContactField; error: string } {
  const c = (x ?? {}) as Partial<Record<keyof Contact, unknown>>;
  const fullName = typeof c.fullName === 'string' ? c.fullName.trim().replace(/\s+/g, ' ') : '';
  if (fullName.length < 2 || fullName.length > NAME_MAX) return { ok: false, field: 'fullName', error: 'Enter your full name' };
  const email = typeof c.email === 'string' ? normaliseEmail(c.email) : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, field: 'email', error: 'Enter a valid email address' };
  const mobile = typeof c.mobile === 'string' ? normaliseMobile(c.mobile) : null;
  if (!mobile) return { ok: false, field: 'mobile', error: 'Enter a Sri Lankan mobile number, for example 071 234 5678' };
  const birthDate = typeof c.birthDate === 'string' ? c.birthDate : '';
  if (!realDate(birthDate)) return { ok: false, field: 'birthDate', error: 'Enter your date of birth' };
  const age = ageOn(birthDate, today);
  if (age < 13 || age > 70) return { ok: false, field: 'birthDate', error: 'Check your date of birth' };
  if (consent !== CONSENT_VERSION) return { ok: false, field: 'consent', error: 'Please read and agree to how ZedPath uses your details' };
  return { ok: true, contact: { fullName, email, mobile, birthDate } };
}
