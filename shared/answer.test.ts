// Fixed sample answers in the shapes the model actually returns (no AI calls in tests).
import { describe, expect, it } from 'vitest';
import { layoutAnswer, sentences } from './answer.ts';

const WALL = 'Yes. Architecture at the University of Moratuwa needs a separate aptitude test [2]. You apply for it directly to the university, ' +
  'and it has its own date [3]. You also need an Ordinary Pass (S) in Art at O/L [2]. The registration fee is Rs. 50 [4].';

describe('sentences', () => {
  it('keeps citations with their sentence and does not split on Rs. or p.', () => {
    expect(sentences(WALL)).toEqual([
      'Yes.',
      'Architecture at the University of Moratuwa needs a separate aptitude test [2].',
      'You apply for it directly to the university, and it has its own date [3].',
      'You also need an Ordinary Pass (S) in Art at O/L [2].',
      'The registration fee is Rs. 50 [4].',
    ]);
  });
  it('handles a citation after the full stop, and several markers', () => {
    expect(sentences('It needs a C in Physics. [1] Ruhuna is Likely for you. [1, 2] Colombo is a Reach.'))
      .toEqual(['It needs a C in Physics. [1]', 'Ruhuna is Likely for you. [1, 2]', 'Colombo is a Reach.']);
  });
  it('does not split decimals, page numbers or "No. 16"', () => {
    expect(sentences('The cut-off was 1.4821 last year (see p. 112). The Universities Act No. 16 of 1978 applies.'))
      .toEqual(['The cut-off was 1.4821 last year (see p. 112).', 'The Universities Act No. 16 of 1978 applies.']);
  });
});

describe('layoutAnswer', () => {
  it('turns a wall of text into a lead line and bullets', () => {
    const l = layoutAnswer(WALL);
    expect(l.lead).toBe('Yes.');
    expect(l.bullets).toHaveLength(4);
    expect(l.bullets[3]).toBe('The registration fee is Rs. 50 [4].');
  });
  it('keeps a reply that is already in bullets', () => {
    const l = layoutAnswer('Yes, you can apply [1].\n- It needs a C in Combined Maths or Physics [1].\n- **Ruhuna:** Likely for you.\n\nCheck the UGC notice.');
    expect(l).toEqual({ lead: 'Yes, you can apply [1].', bullets: ['It needs a C in Combined Maths or Physics [1].', '**Ruhuna:** Likely for you.'], rest: ['Check the UGC notice.'] });
  });
  it('leaves a short answer alone', () => {
    expect(layoutAnswer('Not announced yet. Last year it was in June [1].')).toEqual({ lead: 'Not announced yet. Last year it was in June [1].', bullets: [], rest: [] });
  });
  it('works for Sinhala and Tamil sentences too', () => {
    const si = 'ඔව්. ගෘහ නිර්මාණ ශිල්පය සඳහා අභියෝග්‍යතා පරීක්ෂණයක් ඇත [2]. ඔබ විශ්වවිද්‍යාලයට කෙලින්ම අයදුම් කළ යුතුය [3].';
    expect(layoutAnswer(si).bullets).toHaveLength(2);
  });
});
