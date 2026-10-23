// Search for short lists on the phone (subjects in About you, courses in Courses). Every word typed must match the
// start of a word in the item, so "comb math" finds Combined Mathematics, "ruh comp" finds Computer Science at
// Ruhuna, and "012f" finds the Uni-Code. Case, accents and punctuation ("&", ".", "-") are ignored. Pure, tested.

// Sinhala and Tamil vowel signs and the virama are combining marks (\p{M}): they stay inside the word, and the zero-width
// joiners used in conjuncts (ශිෂ්‍යත්ව) are dropped, so a word typed with or without them still matches (CR-015).
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[\u200c\u200d]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

/** Common short forms students type, mapped to the words they stand for. */
const ALIASES: Record<string, string> = {
  maths: 'mathematics', math: 'mathematics', cs: 'computer science', it: 'information technology', ict: 'information communication technology',
  bio: 'biology biological', chem: 'chemistry', phy: 'physics', phys: 'physics physical', eng: 'engineering english', mgt: 'management',
  uom: 'moratuwa', uoc: 'colombo', uop: 'peradeniya', usj: 'jayewardenepura', sjp: 'jayewardenepura', ucsc: 'colombo school of computing',
  econ: 'economics', acc: 'accounting', bst: 'biosystems technology', sft: 'science for technology', et: 'engineering technology',
};

/** True when every word of `query` starts some word of `text` (or of its codes); an empty query matches everything. */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = fold(query).split(' ').filter(Boolean);
  if (!q.length) return true;
  const words = fields.filter(Boolean).flatMap(f => fold(f!).split(' '));
  return q.every(t => words.some(w => w.startsWith(t)) || (ALIASES[t]?.split(' ').some(a => words.some(w => w.startsWith(a))) ?? false));
}
