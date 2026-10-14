// Every value demo mode prefills (shared/demo-data.ts) must pass the server's own checks, so the recorded sign-up never fails.
import { describe, expect, it } from 'vitest';
import { parseExtras } from './account.ts';
import { DEMO_EXTRAS } from '../shared/demo-data.ts';

describe('demo student', () => {
  it('has achievements and interests the server accepts unchanged (apart from server-assigned ids)', () => {
    expect(parseExtras(DEMO_EXTRAS)).toEqual({ ...DEMO_EXTRAS, achievements: DEMO_EXTRAS.achievements.map(a => ({ ...a, id: '' })) });
  });
});
