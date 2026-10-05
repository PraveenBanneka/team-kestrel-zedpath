// Turns a requirement rule tree into short, plain-language lines for the "Needs" row (Gate 1 deck style:
// "C in C. Maths or Physics"). The exact handbook wording stays available as the cited source.
import type { Grade, Rule } from './rules.ts';

export const SHORT_NAMES: Record<string, string> = {
  CMATH: 'Combined Maths', HMATH: 'Higher Maths', MATH: 'Maths', PHY: 'Physics', CHEM: 'Chemistry', BIO: 'Biology',
  AGRI: 'Agricultural Science', ICT: 'ICT', ECON: 'Economics', ACC: 'Accounting', BSTUD: 'Business Studies',
  BSTAT: 'Business Statistics', GEOG: 'Geography', HIST: 'History', POLSCI: 'Political Science', LOGIC: 'Logic',
  ENG: 'English', SIN: 'Sinhala', TAM: 'Tamil', ET: 'Engineering Technology', SFT: 'Science for Technology',
  BST: 'Biosystems Technology', CMS: 'Communication & Media', HOMEEC: 'Home Economics',
  ENG_OL: 'English', MATH_OL: 'Maths', SCI_OL: 'Science', SIN_OL: 'Sinhala', TAM_OL: 'Tamil',
};
const STREAM_NAMES: Record<string, string> = { ARTS: 'Arts', COMMERCE: 'Commerce', BIO: 'Biological Science', PHYS: 'Physical Science', ET: 'Engineering Technology', BST: 'Biosystems Technology' };
const GRADE_WORDS: Record<Grade, string> = { A: 'A', B: 'B or better', C: 'C or better', S: 'a pass' };

export function nameOf(code: string, names: Record<string, string> = {}): string {
  return SHORT_NAMES[code] ?? names[code] ?? code;
}
/** "Physical Science stream"; five of six streams read better as "Any stream except Biological Science". */
function streamsLine(codes: string[]): string {
  const all = Object.keys(STREAM_NAMES);
  if (codes.length >= 4) return `Any stream except ${list(all.filter(c => !codes.includes(c)).map(c => STREAM_NAMES[c]))}`;
  return `${list(codes.map(c => STREAM_NAMES[c]))} stream`;
}
const streams = streamsLine;
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
const gradeIn = (g: Grade, what: string) => (g === 'S' ? `A pass in ${what}` : `${GRADE_WORDS[g]} in ${what}`);

/** Plain lines for one rule. Every line starts with a capital and has no handbook jargon. */
export function describe(rule: Rule, names: Record<string, string> = {}): string[] {
  const n = (c: string) => nameOf(c, names);
  if ('all' in rule) return rule.all.flatMap(r => describe(r, names));
  if ('any' in rule) {
    const leaves = rule.any.filter((r): r is { subject: string; min: Grade } => 'subject' in r);
    if (leaves.length === rule.any.length && new Set(leaves.map(l => l.min)).size === 1)
      return [gradeIn(leaves[0].min, list(leaves.map(l => n(l.subject))))];
    const streams = rule.any.filter((r): r is { streamIs: never[] } => 'streamIs' in r);
    if (streams.length === rule.any.length) return [streamsLine(streams.flatMap(s => (s as { streamIs: string[] }).streamIs))];
    const options = rule.any.map(r => describe(r, names).join('; '));
    return options.length === 1 ? options : [`One of: ${options.map((o, i) => `(${i + 1}) ${o}`).join(' ')}`];
  }
  if ('atLeast' in rule) return [`At least ${rule.atLeast} of: ${rule.of.map(r => describe(r, names).join('; ')).join(' / ')}`];
  if ('subject' in rule) return [gradeIn(rule.min, n(rule.subject))];
  if ('anySubjects' in rule && rule.anySubjects === 1 && rule.from) return [gradeIn(rule.min, list(rule.from.map(n)))];
  if ('anySubjects' in rule) {
    const what = rule.anySubjects === 1 ? 'one subject' : `${rule.anySubjects} subjects`;
    const grade = rule.min === 'S' ? 'Passes in' : `${GRADE_WORDS[rule.min]} in`;
    return [rule.from ? `${grade} ${what} from: ${rule.from.map(n).join(', ')}` : `${grade} any ${what}`];
  }
  if ('gradeCount' in rule && rule.gradeCount === 1) return [gradeIn(rule.min, list(rule.of.map(n)))];
  if ('gradeCount' in rule) return [`At least ${rule.gradeCount} of ${list(rule.of.map(n))} at ${GRADE_WORDS[rule.min]}`];
  if ('streamIs' in rule) return [streams(rule.streamIs)];
  if ('predicate' in rule) return ['A valid Arts subject combination (handbook baskets)'];
  if ('olSubject' in rule) return [`O/L: ${GRADE_WORDS[rule.min]} in ${n(rule.olSubject)}`];
  return [];
}
