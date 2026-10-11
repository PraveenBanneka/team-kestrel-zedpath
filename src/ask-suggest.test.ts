import { afterEach, describe, expect, it } from 'vitest';
import { askSuggestions } from './ask-suggest.ts';
import { setLang } from './i18n/index.ts';
import type { ListEntry } from '../shared/list.ts';

const olympiad = { id: 'a1', activity: 'Sri Lanka Mathematics Olympiad', kind: 'COMPETITION', level: 'NATIONAL', place: 'SECOND', year: 2024 } as const;
const list: ListEntry[] = [
  { uniCode: '136L', group: 'ALL', course: 'Data Science', institution: 'Sabaragamuwa', band: 'SAFE' },
  { uniCode: '013A', group: 'ALL', course: 'Physical Science', institution: 'Colombo', band: 'REACH' }];

describe('Ask suggestions', () => {
  afterEach(() => setLang('en'));
  it("builds the demo student's questions from his own details", () => {
    setLang('en');
    expect(askSuggestions({ achievements: [olympiad], interests: ['Building apps', 'Maths'] }, list)).toEqual([
      'Which courses am I most likely to get into?',
      'I came 2nd at national level in the Sri Lanka Mathematics Olympiad in 2024. Can that help me get into Physical Science at Colombo?',
      'I love building apps and maths. Which degrees fit me best with my results?',
      'Do I need an aptitude test for Architecture at Moratuwa?',
      'What is the interest-free student loan, and can I use it for a private IT degree?']);
  });
  it('without achievements, interests or a list it still offers five general questions', () => {
    setLang('en');
    const s = askSuggestions({ achievements: [], interests: [] }, []);
    expect(s).toHaveLength(5);
    expect(s.join(' ')).not.toMatch(/\{\w+\}/);
  });
  it('aims at university when the list is empty, and says "took part" when there was no place', () => {
    setLang('en');
    const [, q] = askSuggestions({ achievements: [{ ...olympiad, place: 'TAKING_PART', level: 'DISTRICT' }], interests: [] }, []);
    expect(q).toBe('I took part at district level in the Sri Lanka Mathematics Olympiad in 2024. Can that help me get into university?');
  });
  it('fills every placeholder in Sinhala and Tamil too', () => {
    for (const l of ['si', 'ta'] as const) {
      setLang(l);
      expect(askSuggestions({ achievements: [olympiad], interests: ['Maths'] }, list).join(' ')).not.toMatch(/\{\w+\}/);
    }
  });
});
