import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, ageOn, normaliseMobile, parseContact } from './contact.ts';

const OK = { fullName: '  Nimal   Perera ', email: ' Nimal.P@Gmail.com ', mobile: '071 234 5678', birthDate: '2006-05-01' };

describe('normaliseMobile', () => {
  it('accepts the ways Sri Lankans write a mobile number', () => {
    for (const m of ['0712345678', '071 234 5678', '+94 71 234 5678', '94712345678', '0094712345678', '(071) 234-5678'])
      expect(normaliseMobile(m), m).toBe('+94712345678');
  });
  it('refuses landlines, short numbers and other countries', () => {
    for (const m of ['0112345678', '071234567', '+447123456789', 'abc']) expect(normaliseMobile(m), m).toBeNull();
  });
});

describe('parseContact', () => {
  it('normalises name, email and mobile', () => {
    expect(parseContact(OK, CONSENT_VERSION, '2026-10-11')).toEqual({ ok: true,
      contact: { fullName: 'Nimal Perera', email: 'nimal.p@gmail.com', mobile: '+94712345678', birthDate: '2006-05-01' } });
  });
  it('names the first wrong field', () => {
    const f = (c: object, consent: unknown = CONSENT_VERSION) => { const r = parseContact({ ...OK, ...c }, consent, '2026-10-11'); return r.ok ? null : r.field; };
    expect(f({ fullName: 'N' })).toBe('fullName');
    expect(f({ email: 'nimal@gmail' })).toBe('email');
    expect(f({ mobile: '0112345678' })).toBe('mobile');
    expect(f({ birthDate: '2006-02-30' })).toBe('birthDate');
    expect(f({ birthDate: '2020-01-01' })).toBe('birthDate');          // 6 years old
    expect(f({}, true)).toBe('consent');                               // consent must name the wording version
    expect(f({}, null)).toBe('consent');                                // no consent at all
  });
  it('computes age with the birthday included', () => {
    expect(ageOn('2008-10-11', '2026-10-11')).toBe(18);
    expect(ageOn('2008-10-12', '2026-10-11')).toBe(17);
  });
});
