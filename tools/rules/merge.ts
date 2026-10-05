// Produces the reconciled rules file data/rules/rules-2025-2026.json from the two independent encodings.
// Decisions are recorded per course (see data/rules/RECONCILIATION.md). Run from the repo root:
//   node tools/rules/merge.ts <rules-A.json> <rules-B.json>
import fs from 'node:fs';
import path from 'node:path';
import type { Rule } from '../../shared/rules.ts';

const [, , fileA, fileB] = process.argv;
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const RENAME: Record<string, string> = { BUDDH: 'BUDDHISM', HINDU: 'HINDUISM', CHRIST: 'CHRISTIANITY', HINCIV: 'HINDUCIV', EEITECH: 'EEIT' };
const canon = (r: unknown): any => JSON.parse(JSON.stringify(r), (k, v) =>
  (k === 'subject' || k === 'olSubject') && typeof v === 'string' ? (RENAME[v] ?? v)
  : (k === 'of' || k === 'from') && Array.isArray(v) && v.every(x => typeof x === 'string') ? v.map((x: string) => RENAME[x] ?? x) : v);
const A = canon(JSON.parse(fs.readFileSync(fileA, 'utf8')));
const B = canon(JSON.parse(fs.readFileSync(fileB, 'utf8')));

type Decision = { decision: 'AGREED' | 'CHECKER_B' | 'EXTRACTOR_A' | 'MERGED'; reading: 'LITERAL' | 'INCLUSIVE'; note: string };
const decisions: Record<string, Decision> = {
  '020': { decision: 'CHECKER_B', reading: 'LITERAL', note: 'Handbook p.35: "three subjects from subject baskets in the Arts Stream" subject to four caps: the Arts basket rules apply (A omitted them and accepted e.g. Art, Dance, Music: three Basket 03 subjects).' },
  '041': { decision: 'CHECKER_B', reading: 'LITERAL', note: 'As 020 (same section, p.35).' },
  '021': { decision: 'CHECKER_B', reading: 'LITERAL', note: 'Handbook p.36: "satisfied the minimum requirements for admission in Arts Stream or Commerce Stream": group A needs the Arts basket rules, group B the Commerce combination (A checked the stream label only).' },
  '027': { decision: 'MERGED', reading: 'INCLUSIVE', note: 'Handbook p.83: "two subjects from the Biological Science Stream or Physical Science Stream and ICT". The handbook lists no stream subject sets; ZedPath uses the inclusive reading (subjects from either stream may be combined, BR-044) but excludes Mathematics, which the handbook lists as an Arts basket subject (p.31). Group split by stream as in B.' },
  '109': { decision: 'EXTRACTOR_A', reading: 'INCLUSIVE', note: 'Handbook p.104: "two subjects in Physical Science Stream or Commerce Stream and ICT". No stream subject sets in the handbook; inclusive reading (BR-044).' },
};

// MIT 027: B's structure with one inclusive subject pool (no Mathematics) for option (ii).
const GATE: Rule = { gradeCount: 1, min: 'C', of: ['HMATH', 'CMATH', 'MATH', 'PHY'] };
const OL_MIT: Rule = { all: [{ olSubject: 'MATH_OL', min: 'B' }, { olSubject: 'ENG_OL', min: 'C' }] };
const MIT_BIO: Rule = { all: [GATE, { streamIs: ['BIO'] }] };
const MIT_OTHER: Rule = { all: [GATE, { streamIs: ['PHYS', 'COMMERCE', 'ARTS', 'ET', 'BST'] }, { any: [{ streamIs: ['PHYS'] },
  { all: [{ subject: 'ICT', min: 'S' }, { anySubjects: 2, min: 'S', from: ['BIO', 'CHEM', 'PHY', 'AGRI', 'CMATH', 'HMATH'] }] }] }] };

const courses: Record<string, unknown> = {};
for (const code of Object.keys(B.courses).sort()) {
  const d = decisions[code] ?? { decision: 'AGREED', reading: 'LITERAL', note: 'Both encodings behave identically on every tested case.' };
  let c = d.decision === 'EXTRACTOR_A' ? A.courses[code] : B.courses[code];
  if (code === '027') c = { ...B.courses[code], al: { any: [MIT_BIO, MIT_OTHER] }, ol: OL_MIT,
    groups: { BIO: { al: MIT_BIO, ol: OL_MIT }, OTHER: { al: MIT_OTHER, ol: OL_MIT } } };
  const { confidence: _c, notes: _n, ...clean } = c;
  courses[code] = { ...clean, reconciliation: d };
}
const out = { academicYear: '2025/2026', source: 'UGC handbook 2025/26, Section 2.2', subjects: B.subjects, courses };
fs.mkdirSync(path.join(ROOT, 'data', 'rules'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'rules', 'rules-2025-2026.json'), JSON.stringify(out, null, 1));
console.log(`rules-2025-2026.json: ${Object.keys(courses).length} courses; decisions:`,
  Object.values(courses).reduce((m: Record<string, number>, c: any) => (m[c.reconciliation.decision] = (m[c.reconciliation.decision] ?? 0) + 1, m), {}));
