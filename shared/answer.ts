// Ask FindMyWay answer layout (CR-002, Praveen 2026-10-11: "format AI's answers ... currently it looks like a wall of
// text"). The model is asked for a one-line answer plus short cited bullets; this makes the phone show that layout even
// when a reply arrives as one long paragraph. Pure and deterministic, so it is tested on fixed answers (no AI calls).

export interface AnswerLayout { lead: string; bullets: string[]; rest: string[] }

// Words ending in a full stop that do not end a sentence (handbook style: "Rs. 50", "p.112", "No. 16", "e.g.").
const ABBREV = /(?:\b(?:Rs|No|Nos|p|pp|e\.g|i\.e|Dr|Mr|Mrs|Ms|St|Sec|vs|etc|approx|Govt|Dept|Univ)|\b[A-Z])\.$/;
const CITE_TOKEN = /^\[\d+(?:\s*,\s*\d+)*\][.,;:]?$/;

/** Splits text into sentences, keeping each citation marker ("[2]" or "[1, 3]") with the sentence it follows. */
export function sentences(text: string): string[] {
  // A citation is one token even with spaces inside ("[1, 2]"); everything else splits on spaces.
  const tokens = text.replace(/\s+/g, ' ').trim().match(/\[\d+(?:\s*,\s*\d+)*\][.,;:]?|\S+/g) ?? [];
  const out: string[] = [];
  let cur: string[] = [], ended = false;
  for (const t of tokens) {
    if (ended && !CITE_TOKEN.test(t)) { out.push(cur.join(' ')); cur = []; ended = false; }
    cur.push(t);
    if (CITE_TOKEN.test(t)) { if (/[.!?]$/.test(t)) ended = true; continue; }   // "[2]." ends the sentence it closes
    const word = t.replace(/(\[\d+(?:\s*,\s*\d+)*\])+/g, '');   // "test[2]." -> "test."
    ended = /[.!?।]["”’)]?$/.test(word) && !ABBREV.test(word);
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

/**
 * The layout the screen shows: one lead line, then bullets.
 * - A reply that already has bullet lines ("- ", "* ", "• ", "1. ") keeps them; the first other line is the lead.
 * - A reply of plain paragraphs: the first sentence is the lead and the following sentences become bullets, when there
 *   are at least three sentences (two short sentences read fine as they are).
 */
export function layoutAnswer(text: string): AnswerLayout {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  const isBullet = (l: string) => /^([-*•]|\d+[.)])\s+/.test(l);
  const strip = (l: string) => l.replace(/^([-*•]|\d+[.)])\s+/, '');
  if (lines.some(isBullet)) {
    const firstPlain = lines.findIndex(l => !isBullet(l));
    const lead = firstPlain === 0 ? lines[0] : '';
    const after = lines.slice(lead ? 1 : 0);
    return { lead, bullets: after.filter(isBullet).map(strip), rest: after.filter(l => !isBullet(l)) };
  }
  const all = sentences(lines.join(' '));
  if (all.length < 3) return { lead: all.join(' '), bullets: [], rest: [] };
  return { lead: all[0], bullets: all.slice(1), rest: [] };
}
