import { describe, expect, it } from 'vitest';
import { matches } from './search.ts';

describe('matches', () => {
  it('matches word starts in any order, ignoring case and punctuation', () => {
    expect(matches('comb math', 'Combined Mathematics')).toBe(true);
    expect(matches('MATHS', 'Combined Mathematics')).toBe(true);
    expect(matches('ruh comp', 'Computer Science', 'University of Ruhuna')).toBe(true);
    expect(matches('sports man', 'Sports Science & Management')).toBe(true);
    expect(matches('sports and', 'Sports Science & Management')).toBe(true);
  });
  it('finds Uni-Codes and common short forms', () => {
    expect(matches('012f', 'Computer Science', 'Ruhuna', '012F')).toBe(true);
    expect(matches('cs', 'Computer Science')).toBe(true);
    expect(matches('uom it', 'Information Technology', 'University of Moratuwa')).toBe(true);
    expect(matches('ict', 'Information & Communication Technology')).toBe(true);
  });
  it('does not match the middle of a word, and needs every word', () => {
    expect(matches('ology', 'Biology')).toBe(false);
    expect(matches('physics chem', 'Physics')).toBe(false);
  });
  it('matches everything for an empty query', () => expect(matches('  ', 'Anything')).toBe(true));
});
