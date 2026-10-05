// Two-model check for the 2025/26 course rules (US-902 applied to our own seed data).
// Two independent encodings (A from the requirement texts, B from the raw handbook pages) are compared by BEHAVIOUR:
// for every course, every relevant stream x subject-combination x grade assignment is evaluated under both rules.
// Structure may differ; any student treated differently is a disagreement to resolve against the handbook.
// Run from the repo root:  node tools/rules/compare.ts <rules-A.json> <rules-B.json> [out.json]
import fs from 'node:fs';
import { evaluate, type Grade, type Rule, type Student, type StreamCode } from '../../shared/rules.ts';

const [, , fileA, fileB, out] = process.argv;
type Unit = { al: Rule; ol: Rule | null };
type Course = Unit & { name: string; groups: Record<string, Unit> | null; quote: string; page: number; confidence?: number };
type RulesFile = { subjects: Record<string, string>; courses: Record<string, Course> };

const RENAME: Record<string, string> = { BUDDH: 'BUDDHISM', HINDU: 'HINDUISM', CHRIST: 'CHRISTIANITY', HINCIV: 'HINDUCIV', EEITECH: 'EEIT' };
const canon = (r: unknown): any => JSON.parse(JSON.stringify(r), (k, v) =>
  (k === 'subject' || k === 'olSubject') && typeof v === 'string' ? (RENAME[v] ?? v)
  : (k === 'of' || k === 'from') && Array.isArray(v) && v.every(x => typeof x === 'string') ? v.map((x: string) => RENAME[x] ?? x) : v);
const A: RulesFile = canon(JSON.parse(fs.readFileSync(fileA, 'utf8')));
const B: RulesFile = canon(JSON.parse(fs.readFileSync(fileB, 'utf8')));

const STREAMS: StreamCode[] = ['ARTS', 'COMMERCE', 'BIO', 'PHYS', 'ET', 'BST'];
const FILLERS = ['ECON', 'BIO', 'ENG', 'GEOG', 'BUDDHISM', 'ART', 'FRE', 'ICT', 'ZZ_OTHER'];   // exercise "any other" paths

function walk(r: Rule | null, f: (n: any) => void) {
  if (!r) return; f(r);
  for (const k of ['all', 'any', 'of'] as const) if (Array.isArray((r as any)[k])) for (const c of (r as any)[k]) if (typeof c === 'object') walk(c, f);
}
function facts(units: Unit[]) {
  const subjects = new Set<string>(), olSubjects = new Set<string>(), grades = new Set<Grade>(['S']);
  for (const u of units) {
    walk(u.al, n => { if (n.subject) subjects.add(n.subject); if (n.min) grades.add(n.min); for (const k of ['of', 'from']) if (Array.isArray(n[k]) && typeof n[k][0] === 'string') n[k].forEach((s: string) => subjects.add(s)); });
    walk(u.ol, n => { if (n.olSubject) olSubjects.add(n.olSubject); if (n.subject) subjects.add(n.subject); });
  }
  return { subjects, olSubjects, grades: [...grades] };
}
function* combos<T>(xs: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) { yield acc; return; }
  for (let i = start; i < xs.length; i++) yield* combos(xs, k, i + 1, [...acc, xs[i]]);
}
function* gradeTuples(g: Grade[], n: number): Generator<Grade[]> {
  if (n === 0) { yield []; return; }
  for (const x of g) for (const rest of gradeTuples(g, n - 1)) yield [x, ...rest];
}

type Diff = { course: string; name: string; unit: string; disagreements: number; checked: number; examples: string[] };
const diffs: Diff[] = [];
let totalChecked = 0;

function compareUnit(code: string, name: string, label: string, ua: Unit, ub: Unit) {
  const f = facts([ua, ub]);
  const pool = [...new Set([...f.subjects, ...FILLERS])];
  const olSubs = [...f.olSubjects];
  const olGrades: (Grade | 'F')[] = ['B', 'C', 'S', 'F'];
  const olCases: (Student['ol'])[] = [undefined, ...(olSubs.length ? [...gradeTuples(olGrades as Grade[], olSubs.length)]
    .slice(0, 256).map(t => Object.fromEntries(olSubs.map((s, i) => [s, t[i]]))) : [])];
  let n = 0, bad = 0; const ex: string[] = [];
  for (const subs of combos(pool, 3)) for (const g of gradeTuples(f.grades, 3)) for (const stream of STREAMS) {
    const al = Object.fromEntries(subs.map((s, i) => [s, g[i]])) as Record<string, Grade>;
    for (const ol of (ua.ol || ub.ol) ? olCases : [undefined]) {
      const s: Student = { stream, al, ol }; n++;
      const va = evaluate(ua.al, ua.ol ?? undefined, s), vb = evaluate(ub.al, ub.ol ?? undefined, s);
      if (va !== vb) { bad++; if (ex.length < 4) ex.push(`${stream} ${subs.map((x, i) => `${x}:${g[i]}`).join(' ')}${ol ? ' OL ' + JSON.stringify(ol) : ''} -> A ${va}, B ${vb}`); }
    }
  }
  totalChecked += n;
  if (bad) diffs.push({ course: code, name, unit: label, disagreements: bad, checked: n, examples: ex });
}

const codes = Object.keys(A.courses).sort();
for (const code of codes) {
  const a = A.courses[code], b = B.courses[code];
  if (!b) { diffs.push({ course: code, name: a.name, unit: 'missing in B', disagreements: 1, checked: 0, examples: [] }); continue; }
  compareUnit(code, a.name, 'course', a, b);
  const ga = Object.keys(a.groups ?? {}).sort().join(','), gb = Object.keys(b.groups ?? {}).sort().join(',');
  if (ga !== gb) diffs.push({ course: code, name: a.name, unit: `group codes differ: A [${ga}] B [${gb}]`, disagreements: 1, checked: 0, examples: [] });
  else for (const g of Object.keys(a.groups ?? {})) compareUnit(code, a.name, `group ${g}`, a.groups![g], b.groups![g]);
}

const agreeCourses = codes.filter(c => !diffs.some(d => d.course === c));
console.log(`Compared ${codes.length} courses over ${totalChecked.toLocaleString()} student cases.`);
console.log(`Agree on every case: ${agreeCourses.length} courses. Disagree: ${new Set(diffs.map(d => d.course)).size} courses.`);
for (const d of diffs) {
  console.log(`\n${d.course} ${d.name} [${d.unit}]: ${d.disagreements} of ${d.checked} cases differ`);
  for (const e of d.examples) console.log(`   ${e}`);
}
if (out) fs.writeFileSync(out, JSON.stringify({ totalChecked, agree: agreeCourses, diffs }, null, 1));
