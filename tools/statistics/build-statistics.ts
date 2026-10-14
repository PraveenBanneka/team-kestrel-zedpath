// Compiles the verified extracts of "Sri Lanka University Statistics 2024" (UGC; data/ugc/statistics-2024/*.json, each
// number checked against the printed table twice) into worker/generated/statistics-2024.json: one set of facts per
// institution letter, each with the table, the PDF page and the link, so the course page can cite it (Praveen 2026-10-15).
// Honest flags are carried, never smoothed over: 2024 graduate figures are provisional; "Information not submitted" means
// no data, not zero; university welfare totals include their campuses.
// Run from the repo root:  node tools/statistics/build-statistics.ts
import fs from 'node:fs';
import path from 'node:path';
import type { InstitutionFact, StatisticsFile } from '../../shared/statistics.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(ROOT, 'data', 'ugc', 'statistics-2024');
type Row = Record<string, unknown> & { institution: string; letter: string | null };
type Table = { table: string | null; title: string; page: number; rows: Row[] };
type Src = { source: { url: string; chapter: string }; tables: Table[] };
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Src;
const table = (s: Src, id: string) => { const t = s.tables.find(x => x.table === id); if (!t) throw new Error(`table ${id} missing`); return t; };

const hostels = read('hostels-welfare.json'), enrol = read('enrolment.json'), grads = read('graduates.json'), adm = read('admissions.json');
const facts: Record<string, InstitutionFact[]> = {};
const add = (letter: string | null, f: InstitutionFact) => { if (letter) (facts[letter] ??= []).push(f); };
const cite = (s: Src, t: Table, page = t.page) => ({ url: `${s.source.url}#page=${page}`, page, table: t.table ?? '', chapter: s.source.chapter });

// Students admitted for 2023/2024 (A/L 2023 results), per institution: the Total row of Table 2.2.
const t22 = table(adm, '2.2');
for (const r of t22.rows) if (r.faculty === 'Total' && typeof r.total === 'number')
  add(r.letter, { kind: 'ADMITTED', value: r.total, flags: [], source: cite(adm, t22, typeof r.page === 'number' ? r.page : t22.page) });

// Undergraduates enrolled in 2024 (Table 3.1(a), UGC intake, including backlog): the institution total rows.
const t31 = table(enrol, '3.1(a)');
for (const r of t31.rows) if (r.field === null && typeof r.total === 'number') add(r.letter, { kind: 'STUDENTS', value: r.total, flags: [], source: cite(enrol, t31) });

// Permanent hostel places at 31 December 2024 and the share of undergraduates they can house (Table 7.1).
const t71 = table(hostels, '7.1');
for (const r of t71.rows) if (typeof r.total === 'number' && r.letter)
  add(r.letter, { kind: 'HOSTEL', value: r.total, share: typeof r.percent_can_be_accommodated === 'number' ? r.percent_can_be_accommodated : undefined, flags: [], source: cite(hostels, t71) });

// Mahapola and Bursary recipients processed in 2024, all academic years (Table 7.2 totals; university totals include campuses).
const t72 = table(hostels, '7.2');
for (const r of t72.rows) if ((r.rowType === 'universityTotal' || r.rowType === 'institutionTotal') && typeof r.total_mahapola === 'number')
  add(r.letter, { kind: 'WELFARE', value: r.total_mahapola, value2: typeof r.total_bursary === 'number' ? r.total_bursary : undefined,
    flags: r.rowType === 'universityTotal' ? ['INCLUDES_CAMPUSES'] : [], source: cite(hostels, t72, typeof r.pdfPage === 'number' ? r.pdfPage : t72.page) });

// Graduates in 2024 (Table 4.1, provisional). Footnote 7 = "Information not submitted": the total is then not a count.
const t41 = table(grads, '4.1');
for (const r of t41.rows) if (r.year === 2024 && r.field === 'Total' && typeof r.total === 'number') {
  const fields = t41.rows.filter(x => x.letter === r.letter && x.year === 2024 && x.institution === r.institution);
  const notSubmitted = (x: Row) => Array.isArray(x.footnotes) && (x.footnotes as string[]).includes('7');
  if (notSubmitted(r)) continue;                                                  // no data at all (e.g. Uva Wellassa)
  add(r.letter, { kind: 'GRADUATES', value: r.total, flags: ['PROVISIONAL', ...(fields.some(notSubmitted) ? ['INCOMPLETE' as const] : [])],
    source: cite(grads, t41, typeof r.page === 'number' ? r.page : t41.page) });
}

const out: StatisticsFile = {
  title: 'Sri Lanka University Statistics 2024', publisher: 'University Grants Commission', retrievedOn: '2026-10-15', institutions: facts,
};
fs.writeFileSync(path.join(ROOT, 'worker', 'generated', 'statistics-2024.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`statistics 2024: ${Object.keys(facts).length} institutions, ${Object.values(facts).flat().length} facts`);
