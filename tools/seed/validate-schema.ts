// Validates ZP-DOC-05 Data Design against real data:
//  1. applies migrations/0001_initial_schema.sql to an in-memory SQLite database (same engine family as D1),
//  2. loads the verified UGC 2025/26 and 2024/25 data (data/ugc/) via load.ts,
//  3. runs integrity checks and a set of negative tests (constraints MUST reject bad data),
//  4. prints a report used as evidence in ZP-DOC-05.
// Run from the repo root:  node tools/seed/validate-schema.ts
import fs from 'node:fs';
import path from 'node:path';
import { loadDatabase } from './load.ts';

const { db, HB, COP, NOW, fact, mapping, unmatched, fuzzy, cut2526, cut2425, skipped2425, history } = loadDatabase();
const report: string[] = [];
const log = (s: string) => { report.push(s); console.log(s); };

// ---------------------------------------------------------------- rule trees: one example per node kind
const insNode = db.prepare(`INSERT INTO subject (subject_code, name_en) VALUES (?, ?)`);
for (const [c, n] of [['BIO', 'Biology'], ['CHEM', 'Chemistry'], ['PHY', 'Physics'], ['CMATH', 'Combined Mathematics'], ['HMATH', 'Higher Mathematics'],
  ['ICT', 'Information & Communication Technology'], ['ECON', 'Economics'], ['ACC', 'Accounting'], ['BSTUD', 'Business Studies'], ['ENG_OL', 'English (O/L)'], ['MATH_OL', 'Mathematics (O/L)']]) insNode.run(c, n);
const node = db.prepare(`INSERT INTO rule_node (parent_id, position, kind, threshold, subject_code, min_grade, stream_code, predicate_name, fact_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING node_id`);
const N = (parent: number | null, pos: number, kind: string, o: { t?: number; s?: string; g?: string; st?: string; p?: string; f?: number } = {}) =>
  (node.get(parent, pos, kind, o.t ?? null, o.s ?? null, o.g ?? null, o.st ?? null, o.p ?? null, o.f ?? null) as { node_id: number }).node_id;
// Medicine 001: BIO, CHEM, PHY at S, and at least two of them at C (handbook p.50)
const med = N(null, 0, 'ALL', { f: fact('RULE', HB, 50, "At least two 'C' grades and a 'S' grade in Biology, Chemistry and Physics") });
['BIO', 'CHEM', 'PHY'].forEach((s, i) => N(med, i, 'SUBJECT', { s, g: 'S' }));
const gc = N(med, 3, 'GRADE_COUNT', { t: 2, g: 'C' }); ['BIO', 'CHEM', 'PHY'].forEach((s, i) => N(gc, i, 'SUBJECT', { s, g: 'C' }));
// Computer Science 012: C in CMATH or PHY or HMATH, plus two other listed subjects at S (handbook p.70)
const cs = N(null, 0, 'ALL', { f: fact('RULE', HB, 70, "At least a 'C' grade in Combined Mathematics or Physics or Higher Mathematics") });
const gate = N(cs, 0, 'ANY'); ['CMATH', 'PHY', 'HMATH'].forEach((s, i) => N(gate, i, 'SUBJECT', { s, g: 'C' }));
const two = N(cs, 1, 'AT_LEAST', { t: 2 }); ['CMATH', 'PHY', 'CHEM', 'ICT', 'HMATH'].forEach((s, i) => N(two, i, 'SUBJECT', { s, g: 'S' }));
// Entrepreneurship-style: any three subjects within named streams (handbook p.94)
const ent = N(null, 0, 'ALL', { f: fact('RULE', HB, 94) });
const st = N(ent, 0, 'ANY'); ['COMMERCE', 'BIO', 'PHYS'].forEach((x, i) => N(st, i, 'STREAM_IS', { st: x }));
N(ent, 1, 'ANY_SUBJECTS', { t: 3, g: 'S' });
// Arts 019: basket rules implemented in code; O/L gate example: credit in English and Mathematics
N(null, 0, 'PREDICATE', { p: 'ARTS_BASKETS', f: fact('RULE', HB, 40) });
const ol = N(null, 0, 'ALL', { f: fact('RULE', HB, 149) }); N(ol, 0, 'OL_SUBJECT', { s: 'ENG_OL', g: 'C' }); N(ol, 1, 'OL_SUBJECT', { s: 'MATH_OL', g: 'C' });
db.prepare(`UPDATE selection_group SET al_rule_root_id = ? WHERE group_id = (SELECT g.group_id FROM selection_group g JOIN offering_year y USING (offering_year_id)
  WHERE y.course_code='001' AND y.institution_letter='A' AND y.academic_year='2025/2026')`).run(med);

// ---------------------------------------------------------------- negative tests: each statement MUST be rejected
const anyGroup = (db.prepare('SELECT group_id FROM selection_group LIMIT 1').get() as { group_id: number }).group_id;
const f1 = fact('CUTOFF', COP, 1);
const negative: [string, string][] = [
  ['Z-score above +4.0000', `INSERT INTO cutoff VALUES (${anyGroup}, 'XXX', 'VALUE', 40001, ${f1})`],
  ['VALUE status without a number', `UPDATE cutoff SET min_z_e4 = NULL WHERE status = 'VALUE' AND rowid = (SELECT min(rowid) FROM cutoff WHERE status='VALUE')`],
  ['NQC with a number', `UPDATE cutoff SET min_z_e4 = 12345 WHERE rowid = (SELECT min(rowid) FROM cutoff WHERE status='NQC')`],
  ['cut-off for an unknown district', `INSERT INTO cutoff VALUES (${anyGroup}, 'ZZZ', 'NQC', NULL, ${f1})`],
  ['two cut-offs for the same group and district', `INSERT INTO cutoff SELECT group_id, district_code, status, min_z_e4, ${f1} FROM cutoff LIMIT 1`],
  ['campus without a parent university', `INSERT INTO institution VALUES ('Q', 'Test Campus', 'CAMPUS', NULL)`],
  ['university with a parent', `INSERT INTO institution VALUES ('Q', 'Test University', 'UNIVERSITY', 'A')`],
  ['malformed course code', `INSERT INTO course VALUES ('12', 'Bad', NULL)`],
  ['offering for a course that does not exist', `INSERT INTO offering (course_code, institution_letter) VALUES ('999', 'A')`],
  ['duplicate Uni-Code', `INSERT INTO offering (course_code, institution_letter) VALUES ('001', 'A')`],
  ['academic year not matching exam year', `INSERT INTO intake_year VALUES ('2026/2027', 2025)`],
  ['SUBJECT rule node without a subject', `INSERT INTO rule_node (kind, min_grade) VALUES ('SUBJECT', 'S')`],
  ['AT_LEAST rule node without a threshold', `INSERT INTO rule_node (kind) VALUES ('AT_LEAST')`],
  ['grade outside A/B/C/S', `INSERT INTO rule_node (kind, subject_code, min_grade) VALUES ('SUBJECT', 'BIO', 'D')`],
  ['fact attached to a non-root rule node', `UPDATE rule_node SET fact_id = ${f1} WHERE parent_id IS NOT NULL AND rowid = (SELECT min(rowid) FROM rule_node WHERE parent_id IS NOT NULL)`],
  ['auto-publish with low checker confidence', `INSERT INTO extraction_run (source_id, started_at, status) VALUES (${HB}, '${NOW}', 'RUNNING');
     INSERT INTO candidate_fact (run_id, kind, payload_json, page, extractor_confidence, checker_verdict, checker_confidence, state, published_fact_id)
     VALUES (last_insert_rowid(), 'RULE', '{}', 1, 0.95, 'AGREE', 0.50, 'AUTO_PUBLISHED', ${f1})`],
  ['queued candidate that is already published', `INSERT INTO candidate_fact (run_id, kind, payload_json, page, extractor_confidence, state, published_fact_id)
     VALUES ((SELECT max(run_id) FROM extraction_run), 'RULE', '{}', 1, 0.5, 'QUEUED', ${f1})`],
  ['payload that is not JSON', `INSERT INTO candidate_fact (run_id, kind, payload_json, page, extractor_confidence, state)
     VALUES ((SELECT max(run_id) FROM extraction_run), 'RULE', 'not json', 1, 0.5, 'QUEUED')`],
  ['estimated deadline without a basis', `INSERT INTO deadline (academic_year, kind, title_en, due_on, certainty, fact_id) VALUES ('2025/2026', 'OTHER', 'x', '2026-11-01', 'ESTIMATED', ${f1})`],
  ['push endpoint that is not https', `INSERT INTO push_subscription VALUES ('${'a'.repeat(32)}', 'http://x', 'k', 'a', '${NOW}')`],
  ['closed report without a resolver', `INSERT INTO mistake_report (fact_id, created_at, state) VALUES (${f1}, '${NOW}', 'FIXED')`],
  ['senior without a verified institution', `INSERT INTO account (auth_subject, role, created_at) VALUES ('sub-1', 'SENIOR', '${NOW}')`],
  ['private-degree cost range reversed', `INSERT INTO route (route_group, name_en, provider, cost_min_lkr, cost_max_lkr, fact_id) VALUES ('PRIVATE_DEGREE', 'x', 'y', 900, 100, ${f1})`],
  ['NVQ level on a non-vocational route', `INSERT INTO route (route_group, name_en, provider, nvq_level, fact_id) VALUES ('JOB_EXAM', 'x', 'y', 5, ${f1})`],
];
let rejected = 0; const accepted: string[] = [];
for (const [name, sql] of negative) {
  db.exec('SAVEPOINT t');
  try { db.exec(sql); accepted.push(name); } catch { rejected++; }
  db.exec('ROLLBACK TO t; RELEASE t');
}

// ---------------------------------------------------------------- integrity checks
const one = (sql: string) => Object.values(db.prepare(sql).get() as object)[0] as number;
const checks: [string, number, number][] = [
  ['Uni-Codes (offerings)', one('SELECT count(*) FROM offering'), 255],
  ['course codes', one('SELECT count(*) FROM course'), 121],
  ['institutions', one('SELECT count(*) FROM institution'), 20],
  ['2025/26 offering-years', one(`SELECT count(*) FROM offering_year WHERE academic_year='2025/2026'`), 255],
  ['2025/26 proposed intake (Uni-Code places; +900 Arts additional intake = 42,937)', one(`SELECT sum(proposed_intake) FROM offering_year WHERE academic_year='2025/2026'`), 42037],
  ['2025/26 cut-off columns matched to a Uni-Code', mapping.size, 260],
  ['2025/26 cut-off cells loaded', cut2526, 6500],
  ['2025/26 selection groups', one(`SELECT count(*) FROM selection_group g JOIN offering_year y USING (offering_year_id) WHERE y.academic_year='2025/2026'`), 260],
  ['2025/26 Uni-Codes with no selection group (no cut-offs)', one(`SELECT count(*) FROM offering_year y WHERE y.academic_year='2025/2026'
     AND NOT EXISTS (SELECT 1 FROM selection_group g WHERE g.offering_year_id = y.offering_year_id)`), 0],
  ['2025/26 Uni-Codes split into more than one selection group', one(`SELECT count(*) FROM (SELECT offering_year_id FROM selection_group
     JOIN offering_year USING (offering_year_id) WHERE academic_year='2025/2026' GROUP BY offering_year_id HAVING count(*) > 1)`), 5],
  ['2025/26 NQC cells', one(`SELECT count(*) FROM cutoff c JOIN selection_group g USING (group_id) JOIN offering_year y USING (offering_year_id) WHERE y.academic_year='2025/2026' AND c.status='NQC'`), 1026],
  ['merit-only offerings have one value in all districts', one(`SELECT count(*) FROM (SELECT g.group_id FROM cutoff c JOIN selection_group g USING (group_id) JOIN offering_year y USING (offering_year_id)
     WHERE y.selection_basis='MERIT_ONLY' AND y.academic_year='2025/2026' GROUP BY g.group_id HAVING count(DISTINCT min_z_e4) > 1)`), 0],
  ['facts without a citation', one('SELECT count(*) FROM fact f WHERE NOT EXISTS (SELECT 1 FROM citation c WHERE c.fact_id = f.fact_id)'), 0],
  ['foreign-key violations', (db.prepare('PRAGMA foreign_key_check').all() as unknown[]).length, 0],
];
const pageCount = one('PRAGMA page_count'), pageSize = one('PRAGMA page_size');

log('# ZedPath schema validation report');
log(`- Schema: migrations/0001_initial_schema.sql (${one(`SELECT count(*) FROM sqlite_schema WHERE type='table'`)} tables, ${one(`SELECT count(*) FROM sqlite_schema WHERE type='index' AND sql IS NOT NULL`)} explicit indexes)`);
log(`- Engine: SQLite ${one('SELECT sqlite_version() AS v')} (node:sqlite), foreign keys ON`);
log('');
log('| Check | Result | Expected | Pass |');
log('|---|---:|---:|---|');
let fails = 0;
for (const [name, got, want] of checks) { const ok = got === want; if (!ok) fails++; log(`| ${name} | ${got} | ${want} | ${ok ? 'yes' : '**NO**'} |`); }
log('');
log(`- 2024/25 cut-off cells loaded: ${cut2425} (rows without a 2025/26 Uni-Code skipped: ${skipped2425})`);
log(`- Cut-off columns matched by token similarity rather than exact name: ${fuzzy.length}`);
for (const [id, m] of fuzzy) log(`  - ${id} -> ${m.uni} (${m.method})`);
log(`- Unmatched cut-off columns: ${unmatched.length}`);
for (const u of unmatched) log(`  - ${u}`);
log(`- Negative tests rejected by constraints: ${rejected} of ${negative.length}`);
for (const a of accepted) log(`  - **ACCEPTED (should have been rejected):** ${a}`);
for (const [y, h] of Object.entries(history)) log(`- ${y} cut-off cells loaded from the official UGC table: ${h.loaded} (columns of discontinued courses skipped: ${h.skipped} cells)`);
log(`- Database size with five intake years: ${(pageCount * pageSize / 1024 / 1024).toFixed(2)} MB (D1 free limit: 500 MB per database)`);
fs.writeFileSync(path.join(import.meta.dirname, 'validation-report.md'), report.join('\n') + '\n');
process.exit(fails || accepted.length || unmatched.length ? 1 : 0);
