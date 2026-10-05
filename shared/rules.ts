// ZedPath rule engine: the requirement grammar of ZP-DOC-05 (Section "Rule grammar") and its evaluator.
// Pure TypeScript, no I/O, shared by the Worker (authoritative, FR-203) and the browser (instant feedback).

export type Grade = 'A' | 'B' | 'C' | 'S';
export type StreamCode = 'ARTS' | 'COMMERCE' | 'BIO' | 'PHYS' | 'ET' | 'BST';

/** One requirement tree. Leaves that test A/L subjects consume the subject they match (each subject used once). */
export type Rule =
  | { all: Rule[] }                                              // every child, by distinct subjects
  | { any: Rule[] }                                              // at least one child
  | { atLeast: number; of: Rule[] }                              // at least n children, by distinct subjects
  | { subject: string; min: Grade }                              // A/L subject at grade or better (consumes it)
  | { anySubjects: number; min: Grade; from?: string[] }         // n further A/L subjects (optionally from a list)
  | { gradeCount: number; min: Grade; of: string[] }             // check only: n of these subjects at grade or better
  | { streamIs: StreamCode[] }                                   // the student's stream is one of these
  | { predicate: 'ARTS_BASKETS' }                                // named check implemented in code
  | { olSubject: string; min: Grade };                           // G.C.E. O/L subject at grade or better

export interface Student {
  stream: StreamCode;
  /** Exactly three A/L subjects with grades, e.g. { CMATH: 'B', PHY: 'C', ICT: 'A' }. */
  al: Record<string, Grade>;
  /** O/L grades when known; undefined means "not given yet" (FR-113). */
  ol?: Record<string, Grade | 'F'>;
}

export type Verdict = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_OL';

const RANK: Record<Grade | 'F', number> = { A: 4, B: 3, C: 2, S: 1, F: 0 };
export const meets = (g: Grade | 'F' | undefined, min: Grade): boolean => g !== undefined && RANK[g] >= RANK[min];

/**
 * Evaluates an A/L rule. Returns every possible set of subjects left unused after satisfying the rule
 * (empty array = cannot be satisfied). Exploring all assignments makes "and the third subject from..."
 * exact: a subject that satisfies one leaf can never satisfy another.
 */
function sat(rule: Rule, s: Student, free: readonly string[]): string[][] {
  if ('all' in rule) {
    let states: string[][] = [[...free]];
    for (const child of rule.all) states = dedupe(states.flatMap(st => sat(child, s, st)));
    return states;
  }
  if ('any' in rule) return dedupe(rule.any.flatMap(child => sat(child, s, free)));
  if ('atLeast' in rule) {
    const out: string[][] = [];
    for (const combo of combinations(rule.of, rule.atLeast)) out.push(...sat({ all: combo }, s, free));
    return dedupe(out);
  }
  if ('subject' in rule) return free.includes(rule.subject) && meets(s.al[rule.subject], rule.min) ? [free.filter(x => x !== rule.subject)] : [];
  if ('anySubjects' in rule) {
    const pool = free.filter(x => meets(s.al[x], rule.min) && (!rule.from || rule.from.includes(x)));
    return combinations(pool, rule.anySubjects).map(used => free.filter(x => !used.includes(x)));
  }
  if ('gradeCount' in rule) return rule.of.filter(x => meets(s.al[x], rule.min)).length >= rule.gradeCount ? [[...free]] : [];
  if ('streamIs' in rule) return rule.streamIs.includes(s.stream) ? [[...free]] : [];
  if ('predicate' in rule) return artsBaskets(s) ? [[...free]] : [];
  if ('olSubject' in rule) return [[...free]];            // O/L leaves are evaluated by evaluateOl, not here
  throw new Error(`unknown rule node: ${JSON.stringify(rule)}`);
}

/** O/L rules: three-valued, because the student may not have entered O/L grades yet (FR-113). */
function evalOl(rule: Rule, s: Student): boolean | 'UNKNOWN' {
  const and = (xs: (boolean | 'UNKNOWN')[]) => xs.includes(false) ? false : xs.includes('UNKNOWN') ? 'UNKNOWN' : true;
  const or = (xs: (boolean | 'UNKNOWN')[]) => xs.includes(true) ? true : xs.includes('UNKNOWN') ? 'UNKNOWN' : false;
  if ('all' in rule) return and(rule.all.map(r => evalOl(r, s)));
  if ('any' in rule) return or(rule.any.map(r => evalOl(r, s)));
  if ('olSubject' in rule) {
    if (!s.ol) return 'UNKNOWN';
    return meets(s.ol[rule.olSubject], rule.min);
  }
  if ('subject' in rule) return meets(s.al[rule.subject], rule.min);   // "or an A/L pass in Mathematics" alternatives
  throw new Error(`rule node not allowed in an O/L rule: ${JSON.stringify(rule)}`);
}

export function evaluate(al: Rule, ol: Rule | undefined, s: Student): Verdict {
  if (Object.keys(s.al).length !== 3) throw new Error('a student has exactly three A/L subjects');
  if (!Object.values(s.al).every(g => meets(g, 'S'))) return 'NOT_ELIGIBLE';          // BR-001
  if (sat(al, s, Object.keys(s.al)).length === 0) return 'NOT_ELIGIBLE';
  if (!ol) return 'ELIGIBLE';
  const o = evalOl(ol, s);
  return o === true ? 'ELIGIBLE' : o === false ? 'NOT_ELIGIBLE' : 'NEEDS_OL';
}

/**
 * Arts stream basket rules, handbook Section 2.2.1.1, printed pages 31 to 34 (UGC 2025/26), implemented as written.
 * Basket membership: printed pages 31 to 33. Music, Dance and Drama variants (Oriental/Carnatic/Western etc.) share one
 * code per subject area, so "two subjects from one area" cannot occur.
 */
const B1 = ['ECON', 'GEOG', 'HIST', 'HOMEEC', 'AGRI', 'MATH', 'CMATH', 'CMS', 'ICT', 'ACC', 'BSTAT', 'POLSCI', 'LOGIC'];
const TECHNOLOGICAL = ['CIVTECH', 'EEIT', 'AGROTECH', 'MECHTECH', 'FOODTECH', 'BIORESTECH'];   // Basket 01 item 11: one only
const B2_RELIGION_CIVILISATION: [string, string][] = [['BUDDHISM', 'BUDCIV'], ['HINDUISM', 'HINDUCIV'], ['CHRISTIANITY', 'CHRCIV'], ['ISLAM', 'ISLCIV']];
const B2 = [...B2_RELIGION_CIVILISATION.flat(), 'GRCIV'];
const B3 = ['ART', 'DANCE', 'MUSIC', 'DRAMA'];
const NATIONAL = ['SIN', 'TAM', 'ENG'];
const CLASSICAL = ['ARABIC', 'PALI', 'SANSKRIT'];
const FOREIGN = ['CHINESE', 'FRE', 'GER', 'HINDI', 'JAPANESE', 'MALAY', 'RUSSIAN', 'KOR'];
export const ARTS_BASKET: Record<string, 1 | 2 | 3 | 4> = Object.fromEntries([
  ...[...B1, ...TECHNOLOGICAL].map(s => [s, 1]), ...B2.map(s => [s, 2]), ...B3.map(s => [s, 3]),
  ...[...NATIONAL, ...CLASSICAL, ...FOREIGN].map(s => [s, 4]),
]) as Record<string, 1 | 2 | 3 | 4>;

export function artsBaskets(s: Student): boolean {
  const subs = Object.keys(s.al);
  if (subs.some(x => ARTS_BASKET[x] === undefined)) return false;          // every subject must be an Arts subject
  const n = (k: number) => subs.filter(x => ARTS_BASKET[x] === k).length;
  const count = (list: string[]) => subs.filter(x => list.includes(x)).length;
  const [nat, cla, frn] = [count(NATIONAL), count(CLASSICAL), count(FOREIGN)];
  // Basket 04: at most two, except (a) three national languages, (b) at least one national and two classical (p.34)
  const threeNational = nat === 3, nationalPlusTwoClassical = nat >= 1 && cla === 2 && n(4) === 3;
  if (n(4) > 2 && !threeNational && !nationalPlusTwoClassical) return false;
  if (cla === 3 || frn === 3) return false;                                // never three classical or three foreign
  // Basket 02: at most two, and never a religion with its own civilisation (p.32)
  if (n(2) > 2) return false;
  if (B2_RELIGION_CIVILISATION.some(([r, c]) => subs.includes(r) && subs.includes(c))) return false;
  // Basket 03: at most two subjects, from different areas (p.33)
  if (n(3) > 2) return false;
  // Basket 01 item 11: only one technological subject
  if (count(TECHNOLOGICAL) > 1) return false;
  // Basket 01: at least one subject, unless one of the three exceptions applies (p.31 to p.32)
  const exception1 = threeNational;
  const exception2 = n(4) === 3 && nat >= 1 && cla >= 1;                  // national + classical combination
  const exception3 = n(4) === 2 && (n(2) + n(3)) === 1;                   // two languages + a basket 02/03 subject
  return n(1) >= 1 || exception1 || exception2 || exception3;
}

function combinations<T>(xs: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > xs.length) return [];
  const [head, ...rest] = xs;
  return [...combinations(rest, k - 1).map(c => [head, ...c]), ...combinations(rest, k)];
}
const dedupe = (states: string[][]) => [...new Map(states.map(st => [[...st].sort().join(','), st])).values()];
