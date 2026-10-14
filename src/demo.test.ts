import { describe, expect, it } from 'vitest';
import { DEMO_CONTACT, DEMO_EXTRAS, DEMO_PROFILE, DEMO_USERNAME, demoOn } from './demo.ts';
import * as demoModule from './demo.ts';
import * as demoData from '../shared/demo-data.ts';
import { specialIntakeHint } from '../shared/account.ts';
import { parseContact, CONSENT_VERSION } from '../shared/contact.ts';
import { parseProfile } from '../worker/rulebook.ts';
import { USERNAME_RE } from '../shared/account.ts';

describe('demo mode', () => {
  it('is off by default (no ?demo=kasun link, or no browser storage)', () => expect(demoOn()).toBe(false));
  it('prefills only details the server accepts', () => {
    expect(USERNAME_RE.test(DEMO_USERNAME)).toBe(true);
    expect(parseContact(DEMO_CONTACT, CONSENT_VERSION, '2026-10-11').ok).toBe(true);
    expect(parseProfile(DEMO_PROFILE, true)).toEqual(DEMO_PROFILE);
  });
  it('prefills a national sports achievement, which shows the special-intake hint', () => {
    expect(specialIntakeHint(DEMO_EXTRAS)).toEqual({ applies: true, sport: true });
  });
  it('never ships a password (security audit run-1: a prefilled password would be public)', () => {
    expect(Object.keys(demoModule)).not.toContain('DEMO_PASSWORD');
    expect(Object.keys(demoData)).not.toContain('DEMO_PASSWORD');
  });
});
