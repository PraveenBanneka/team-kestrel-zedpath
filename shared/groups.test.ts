import { describe, expect, it } from 'vitest';
import { SAMPLE_KEYS, sampleKey, samplesFor } from './group-samples.ts';
import { MESSAGE_MAX, POST_GAP_MS, POST_WINDOW_MAX, canPost, cleanMessage, moderationSays, seniorBadge, visibleTo } from './groups.ts';

describe('cleanMessage', () => {
  it('trims, folds spaces and keeps single blank lines', () => {
    expect(cleanMessage('  hi   there \r\n\r\n\r\n\nok ')).toEqual({ ok: true, body: 'hi there\n\nok' });
  });
  it('refuses empty, non-text, too long and control characters', () => {
    expect(cleanMessage('   ').ok).toBe(false);
    expect(cleanMessage(42).ok).toBe(false);
    expect(cleanMessage('x'.repeat(MESSAGE_MAX + 1)).ok).toBe(false);
    expect(cleanMessage('x'.repeat(MESSAGE_MAX)).ok).toBe(true);
    expect(cleanMessage('bell\u0007').ok).toBe(false);
  });
});

describe('canPost (rate limit)', () => {
  const now = 1_000_000_000;
  it('allows a first message and refuses one within 3 seconds', () => {
    expect(canPost([], now).ok).toBe(true);
    expect(canPost([now - POST_GAP_MS + 1], now).ok).toBe(false);
    expect(canPost([now - POST_GAP_MS], now).ok).toBe(true);
  });
  it('caps 20 messages in 10 minutes, then lets older ones expire', () => {
    const twenty = Array.from({ length: POST_WINDOW_MAX }, (_, i) => now - 5_000 - i * 1_000);
    expect(canPost(twenty, now).ok).toBe(false);
    expect(canPost(twenty.map(t => t - 10 * 60_000), now).ok).toBe(true);
  });
});

describe('moderationSays (fail closed)', () => {
  it('reads both answer shapes', () => {
    expect(moderationSays({ response: 'safe' })).toBe('SAFE');
    expect(moderationSays({ response: '\n\nunsafe\nS10' })).toBe('UNSAFE');
    expect(moderationSays({ response: { safe: true, categories: [] } })).toBe('SAFE');
    expect(moderationSays({ response: { safe: false, categories: ['S1'] } })).toBe('UNSAFE');
  });
  it('treats anything unreadable as unsafe', () => {
    for (const x of [null, undefined, {}, { response: 42 }, 'unsafe', 'safety first?']) expect(moderationSays(x)).toBe('UNSAFE');
  });
});

it('hides hidden messages and blocked authors only', () => {
  const m = [{ id: 'a', accountId: 1, hidden: false }, { id: 'b', accountId: 2, hidden: false }, { id: 'c', accountId: 1, hidden: true }];
  expect(visibleTo(m, [2]).map(x => x.id)).toEqual(['a']);
  expect(visibleTo(m, []).map(x => x.id)).toEqual(['a', 'b']);
});

it('words the senior badge', () => expect(seniorBadge('Computer Science', 2)).toBe('Verified senior · Computer Science, year 2'));

describe('group rule 3: no contact details (CR-005)', () => {
  it('refuses phone numbers in any spacing and email addresses', () => {
    for (const bad of ['call me 0712345678', 'my no +94 71 234 5678', 'whatsapp 94-71-234-5678', 'mail nimal.p@gmail.com'])
      expect(cleanMessage(bad).ok, bad).toBe(false);
  });
  it('keeps ordinary numbers: Z-scores, years, course codes', () => {
    for (const ok of ['My Z is 1.4518', 'cut-offs from 2021 to 2025', 'course 012 at Colombo', 'rank 120 of 3000'])
      expect(cleanMessage(ok).ok, ok).toBe(true);
  });
});

describe('sample conversations are labelled as sample (trust rule)', () => {
  it('every sample is marked, named "Sample", never "verified", and cannot be reported', () => {
    for (const key of SAMPLE_KEYS) for (const m of samplesFor(key)) {
      expect(m.sample).toBe(true);
      expect(m.author.startsWith('Sample')).toBe(true);
      expect(`${m.badge ?? ''} ${m.body}`).not.toMatch(/verified/i);
      expect(m.id).not.toMatch(/^[0-9a-f]{32}$/);                          // the report API only takes real message ids
      expect(cleanMessage(m.body)).toEqual({ ok: true, body: m.body });     // and they follow the same rules as members
    }
  });
  it('picks a course thread when there is one, else the general one', () => {
    expect(sampleKey('COURSE', '001')).toBe('COURSE:001');
    expect(sampleKey('COURSE', '777')).toBe('COURSE');
    expect(sampleKey('BATCH', null)).toBe('BATCH');
  });
});
