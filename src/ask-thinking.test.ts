import { describe, expect, it } from 'vitest';
import { currentStep, THINKING_LONG_MS, thinkingSteps } from './ask-thinking.ts';
import { en } from './i18n/en.ts';
import { si } from './i18n/si.ts';
import { ta } from './i18n/ta.ts';

describe('Ask waiting steps (TC-155)', () => {
  it('follows the real pipeline order; the results check only when results were sent', () => {
    expect(thinkingSteps(true).map(s => s.key)).toEqual(['ask.step.understand', 'ask.step.search', 'ask.step.results', 'ask.step.write']);
    expect(thinkingSteps(false).map(s => s.key)).toEqual(['ask.step.understand', 'ask.step.search', 'ask.step.write']);
  });
  it('steps advance in time and the last one stays current until the reply comes', () => {
    const s = thinkingSteps(true);
    expect([0, 1199, 1200, 3000, 4999, 5000, 60_000].map(ms => currentStep(s, ms))).toEqual([0, 0, 1, 2, 2, 3, 3]);
    for (const has of [true, false]) {
      const at = thinkingSteps(has).map(x => x.at);
      expect(at).toEqual([...at].sort((a, b) => a - b));
      expect(at[at.length - 1]).toBeLessThan(THINKING_LONG_MS);
    }
  });
  it('every step and "almost there" exist in English, Sinhala and Tamil', () => {
    for (const k of ['ask.step.understand', 'ask.step.search', 'ask.step.results', 'ask.step.write', 'ask.step.long'] as const) {
      expect(en[k], k).toBeTruthy();
      expect(si[k], k).toMatch(/[඀-෿]/);
      expect(ta[k], k).toMatch(/[஀-௿]/);
    }
  });
});
