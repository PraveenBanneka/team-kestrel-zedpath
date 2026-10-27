// What Ask FindMyWay shows while it works (Praveen 2026-10-24: "always shows reading handbook... make the waiting more
// dynamic and engaging"). The steps are the real pipeline in its real order (worker/ask.ts): understand the question
// (embedding), search the handbook and official pages (Vectorize), check the student's results (rule engine, only when
// results were sent), write the cited answer (the model). The timer only paces them; it never claims a step is done
// that the server has not reached in that order, and the last step stays "in progress" until the reply arrives.
import type { Key } from './i18n/index.ts';

export interface ThinkingStep { key: Key; at: number }

/** Milliseconds after sending at which each step becomes the current one. */
export function thinkingSteps(hasResults: boolean): ThinkingStep[] {
  return [
    { key: 'ask.step.understand', at: 0 },
    { key: 'ask.step.search', at: 1200 },
    ...(hasResults ? [{ key: 'ask.step.results' as Key, at: 3000 }] : []),
    { key: 'ask.step.write', at: hasResults ? 5000 : 3500 },
  ];
}

/** After this long, "Almost there…" appears under the last step. */
export const THINKING_LONG_MS = 9000;

/** Index of the current step after `elapsed` ms: the last step whose time has come (never past the end). */
export const currentStep = (steps: ThinkingStep[], elapsed: number): number =>
  Math.max(0, steps.reduce((cur, s, i) => (elapsed >= s.at ? i : cur), 0));
