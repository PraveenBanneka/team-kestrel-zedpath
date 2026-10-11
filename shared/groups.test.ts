import { describe, expect, it } from 'vitest';
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
