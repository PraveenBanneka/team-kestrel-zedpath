import { describe, expect, it } from 'vitest';
import { DEMO_CONTACT, DEMO_PASSWORD, DEMO_PROFILE, DEMO_USERNAME, demoOn } from './demo.ts';
import { parseContact, CONSENT_VERSION } from '../shared/contact.ts';
import { parseProfile } from '../worker/rulebook.ts';
import { PASSWORD_MIN, USERNAME_RE } from '../shared/account.ts';

describe('demo mode', () => {
  it('is off by default (no ?demo=kasun link, or no browser storage)', () => expect(demoOn()).toBe(false));
  it('prefills only details the server accepts', () => {
    expect(USERNAME_RE.test(DEMO_USERNAME)).toBe(true);
    expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(PASSWORD_MIN);
    expect(parseContact(DEMO_CONTACT, CONSENT_VERSION, '2026-10-11').ok).toBe(true);
    expect(parseProfile(DEMO_PROFILE, true)).toEqual(DEMO_PROFILE);
  });
});
