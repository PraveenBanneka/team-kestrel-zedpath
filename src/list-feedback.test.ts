// The "added to My list" confirmation (Praveen 2026-10-23) says exactly what happened: how many were added, how many were
// already there, and when the list is full. It never claims an add that did not happen.
import { describe, expect, it } from 'vitest';
import { addedMessage } from './list-feedback.ts';

describe('added-to-list message', () => {
  it('counts one and several', () => {
    expect(addedMessage({ added: 1, already: 0, full: 0 })).toBe('Added 1 course to My list.');
    expect(addedMessage({ added: 3, already: 0, full: 0 })).toBe('Added 3 courses to My list.');
  });
  it('mentions courses already on the list, and a full list', () => {
    expect(addedMessage({ added: 2, already: 1, full: 0 })).toBe('Added 2 courses to My list. 1 were already on it.');
    expect(addedMessage({ added: 0, already: 0, full: 2 })).toBe('Your list is full (125 courses).');
  });
  it('never says "Added 0"', () => {
    expect(addedMessage({ added: 0, already: 2, full: 0 })).toBe('2 were already on it.');
  });
});
