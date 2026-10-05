// Validates ZP-DOC-05 Data Design against real data:
//  1. applies migrations/0001_initial_schema.sql to an in-memory SQLite database (same engine family as D1),
//  2. loads the verified UGC 2025/26 and 2024/25 data (data/ugc/),
//  3. runs integrity checks and a set of negative tests (constraints MUST reject bad data),
//  4. prints a report used as evidence in ZP-DOC-05.
// Run from the repo root:  node tools/seed/validate-schema.ts
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readCsv } from './csv.ts';
import { DISTRICTS, STREAMS, INSTITUTION_KIND, INSTITUTION_ALIASES } from './reference.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = path.join(ROOT, 'data', 'ugc');
const NOW = '2026-10-05T00:00:00Z';
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(path.join(ROOT, 'migrations', '0001_initial_schema.sql'), 'utf8'));

const report: string[] = [];
const log = (s: string) => { report.push(s); console.log(s); };
// Name normalisation: the two UGC documents spell some names differently ("BIO.SC" / "BIOLOGICAL SC.",
// "AGRI BUSINESS" / "AGRIBUSINESS", "BIO RESOURCES" / "BIORESOURCES"); expand abbreviations, drop markers.
const norm = (s: string) => s.toUpperCase().replace(/\bBIO(?:LOGICAL)?\.?\s*SC(?:\.|\b)/g, ' BIOLOGICAL SCIENCE ')
  .replace(/\bPHY(?:SICAL)?\.?\s*SC(?:\.|\b)/g, ' PHYSICAL SCIENCE ').replace(/&/g, ' AND ').replace(/\[[^\]]*\]/g, ' ')
  .replace(/\((BIO SCIENCE|OTHER) STREAM\)/g, ' ').replace(/\s-\s[AB]\b/g, ' ').replace(/[*#]/g, ' ')
  .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toE4 = (z: string): number => {               // exact decimal -> integer ten-thousandths, no float rounding
  const m = z.trim().match(/^(-?)(\d+)\.(\d{4})$/);
  if (!m) throw new Error(`not a 4-decimal Z-score: ${z}`);
  return (m[1] ? -1 : 1) * (Number(m[2]) * 10000 + Number(m[3]));
};
const pdfToPrinted = (pdfPage: number) => pdfPage - 7;   // handbook only

// ---------------------------------------------------------------- inputs
const unicodes = readCsv(path.join(DATA, '2025-2026', 'unicodes.csv'));
const courses = readCsv(path.join(DATA, '2025-2026', 'courses_requirements.csv'));
const copOfferings = readCsv(path.join(DATA, '2025-2026', 'offerings_2025_2026.csv'));
const copCells = readCsv(path.join(DATA, '2025-2026', 'cutoffs_2025_2026.csv'));
const prev = readCsv(path.join(DATA, '2024-2025', 'cutoffs_2024_2025.csv'));

// ---------------------------------------------------------------- helpers to insert facts with citations
const insFact = db.prepare('INSERT INTO fact (kind, updated_at) VALUES (?, ?) RETURNING fact_id');
const insCite = db.prepare('INSERT INTO citation (fact_id, source_id, page, quote) VALUES (?, ?, ?, ?)');
function fact(kind: string, sourceId: number, page: number, quote: string | null = null): number {
  const { fact_id } = insFact.get(kind, NOW) as { fact_id: number };
  insCite.run(fact_id, sourceId, page, quote);
  return fact_id;
}

// ---------------------------------------------------------------- sources
const sha = (f: string) => fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') : null;
const insSource = db.prepare(`INSERT INTO source_document (publisher, title, edition, issue_date, language, sha256, storage_key, url, retrieved_at)
  VALUES ('University Grants Commission', ?, ?, ?, 'EN', ?, ?, 'https://ugc.ac.lk', ?) RETURNING source_id`);
const hbSha = sha(path.join(ROOT, 'student_handbook_english.pdf')) ?? '8b9cc7b24ed2a10ed19c22a1e12d0a9336c0db15f1623ea2aca35334e005c93d';
const copSha = sha(path.join(ROOT, 'COP_2025_2026-ENGLISH_Final.pdf')) ?? 'e1914bfbd287774c7879b7758eff9349c7a4ea40df4ca2ae9db92ac605e88ba0';
const HB = (insSource.get('Admission to Undergraduate Courses of the Universities in Sri Lanka', 'Academic year 2025/2026', null,
  hbSha, 'sources/ugc/handbook-2025-2026-en.pdf', NOW) as { source_id: number }).source_id;
const COP = (insSource.get('Minimum "Z" Scores for selection to various Courses of Study of Universities, in respect of each district',
  'Academic year 2025/2026', '2026-07-31', copSha, 'sources/ugc/cop-2025-2026-en.pdf', NOW) as { source_id: number }).source_id;

// ---------------------------------------------------------------- reference data
for (const s of STREAMS) db.prepare('INSERT INTO stream (stream_code, name_en) VALUES (?, ?)').run(s.code, s.name);
const districtByName = new Map<string, string>();
for (const d of DISTRICTS) {
  db.prepare('INSERT INTO district (district_code, name_en, is_disadvantaged) VALUES (?, ?, ?)').run(d.code, d.name, d.disadvantaged ? 1 : 0);
  districtByName.set(d.name, d.code);
}
const instName = new Map<string, string>();     // letter -> printed name (handbook)
for (const u of unicodes) instName.set(u.uni_code.slice(3), u.university);
const insInst = db.prepare('INSERT INTO institution (letter, name_en, kind, parent_letter) VALUES (?, ?, ?, ?)');
for (const letter of [...instName.keys()].sort((a, b) => (INSTITUTION_KIND[a]?.parent ? 1 : 0) - (INSTITUTION_KIND[b]?.parent ? 1 : 0))) {
  const k = INSTITUTION_KIND[letter] ?? { kind: 'UNIVERSITY' as const };
  insInst.run(letter, instName.get(letter)!, k.kind, k.parent ?? null);
}
const courseName = new Map<string, string>();
for (const c of courses) if (!courseName.has(c.course_code)) courseName.set(c.course_code, c.course_name);
for (const [code, name] of courseName) db.prepare('INSERT INTO course (course_code, name_en) VALUES (?, ?)').run(code, name);
for (const u of unicodes) db.prepare('INSERT INTO offering (course_code, institution_letter) VALUES (?, ?)').run(u.uni_code.slice(0, 3), u.uni_code.slice(3));
db.exec(`INSERT INTO intake_year VALUES ('2024/2025', 2024), ('2025/2026', 2025);`);

// ---------------------------------------------------------------- offering_year 2025/26 (from the handbook)
const insOY = db.prepare(`INSERT INTO offering_year (course_code, institution_letter, academic_year, proposed_intake, duration_text,
  selection_basis, has_aptitude_test, is_suspended, other_requirements, fact_id) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?) RETURNING offering_year_id`);
const oy2526 = new Map<string, number>();
for (const c of courses) {
  const page = pdfToPrinted(Number((c.page.match(/PDF (\d+)/) ?? [])[1] ?? 8));
  const f = fact('OFFERING_YEAR', HB, Math.max(1, page));
  const { offering_year_id } = insOY.get(c.course_code, c.university_letter, '2025/2026', Number(c.proposed_intake) || null,
    c.duration || null, c.selection_basis.startsWith('All Island Merit') ? 'MERIT_ONLY' : 'QUOTA',
    c.aptitude_test.startsWith('Y') ? 1 : 0, c.other_requirements || null, f) as { offering_year_id: number };
  oy2526.set(c.uni_code, offering_year_id);
}

// ---------------------------------------------------------------- map 2025/26 cut-off columns to Uni-Codes
function letterOf(printed: string): string | undefined {
  const n = norm(printed);
  if (INSTITUTION_ALIASES[n]) return INSTITUTION_ALIASES[n];
  for (const [letter, name] of instName) if (norm(name) === n) return letter;
}
const tokens = (s: string) => new Set(norm(s).split(' ').filter(w => !['AND', 'OF', 'IN', 'THE'].includes(w)));
const jaccard = (a: Set<string>, b: Set<string>) => { const i = [...a].filter(x => b.has(x)).length; return i / (a.size + b.size - i || 1); };
function groupCode(o: Record<string, string>): string {
  const h = o.header_raw.toUpperCase();
  if (/\s-\s?A\b/.test(o.course_name)) return 'A';
  if (/\s-\s?B\b/.test(o.course_name)) return 'B';
  if (h.includes('BIO SCIENCE STREAM')) return 'BIO';
  if (h.includes('OTHER STREAM')) return 'OTHER';
  if (h.includes('BIOLOGICAL / PHYSICAL')) return 'BIO_PHYS';
  if (h.includes('COMMERCE STREAM')) return 'COMMERCE';
  return 'ALL';
}
const mapping = new Map<string, { uni: string; group: string; method: string }>();
const unmatched: string[] = [];
for (const o of copOfferings) {
  const letter = letterOf(o.university_normalized || o.university);
  if (!letter) { unmatched.push(`${o.offering_id} ${o.course_name} @ ${o.university}: institution not recognised`); continue; }
  const cands = unicodes.filter(u => u.uni_code.endsWith(letter));
  const compact = (x: string) => norm(x).replace(/ /g, '');      // spacing differences are not real differences
  const exact = cands.filter(u => compact(u.course) === compact(o.course_name));
  let pick: Record<string, string> | undefined, method = 'exact';
  if (exact.length === 1) pick = exact[0];
  else {
    const scored = cands.map(u => ({ u, s: jaccard(tokens(u.course), tokens(o.course_name)) })).sort((a, b) => b.s - a.s);
    if (scored[0] && scored[0].s >= 0.6 && (!scored[1] || scored[1].s < scored[0].s)) { pick = scored[0].u; method = `token similarity ${scored[0].s.toFixed(2)}`; }
  }
  if (!pick) { unmatched.push(`${o.offering_id} ${o.course_name} @ ${o.university}: no confident match`); continue; }
  mapping.set(o.offering_id, { uni: pick.uni_code, group: groupCode(o), method });
}
const fuzzy = [...mapping.entries()].filter(([, m]) => m.method !== 'exact');

// ---------------------------------------------------------------- selection groups + cut-offs 2025/26
const insGroup = db.prepare('INSERT INTO selection_group (offering_year_id, group_code, label_en) VALUES (?, ?, ?) RETURNING group_id');
const insCut = db.prepare('INSERT INTO cutoff (group_id, district_code, status, min_z_e4, fact_id) VALUES (?, ?, ?, ?, ?)');
const groupId = new Map<string, number>();
let cut2526 = 0;
db.exec('BEGIN');
for (const o of copOfferings) {
  const m = mapping.get(o.offering_id); if (!m) continue;
  const key = `${m.uni}|2025/2026|${m.group}`;
  if (!groupId.has(key)) groupId.set(key, (insGroup.get(oy2526.get(m.uni)!, m.group, m.group === 'ALL' ? null : o.course_name) as { group_id: number }).group_id);
}
for (const c of copCells) {
  const m = mapping.get(c.offering_id); if (!m) continue;
  const status = c.status === 'value' ? 'VALUE' : 'NQC';
  const f = fact('CUTOFF', COP, Number(c.page_number), null);
  insCut.run(groupId.get(`${m.uni}|2025/2026|${m.group}`)!, districtByName.get(c.district)!, status, status === 'VALUE' ? toE4(c.cutoff_z) : null, f);
  cut2526++;
}
db.exec('COMMIT');

// ---------------------------------------------------------------- 2024/25 (from the 2025/26 handbook, Section 9)
let cut2425 = 0, skipped2425 = 0;
db.exec('BEGIN');
for (const r of prev) {
  const uni = r.uni_code_2025_26;
  if (!uni) { skipped2425++; continue; }                       // offering no longer exists in 2025/26 (e.g. suspended)
  const [cc, letter] = [uni.slice(0, 3), uni.slice(3)];
  let oy = (db.prepare(`SELECT offering_year_id FROM offering_year WHERE course_code=? AND institution_letter=? AND academic_year='2024/2025'`)
    .get(cc, letter) as { offering_year_id: number } | undefined)?.offering_year_id;
  if (!oy) oy = (insOY.get(cc, letter, '2024/2025', null, null, r.flags.includes('*') ? 'MERIT_ONLY' : 'QUOTA',
    r.flags.includes('#') ? 1 : 0, null, fact('OFFERING_YEAR', HB, Number(r.printed_page))) as { offering_year_id: number }).offering_year_id;
  const g = r.sub_quota ? (r.sub_quota.match(/^([AB]):/)?.[1] ?? (r.sub_quota.includes('BIO SCIENCE') ? 'BIO' : r.sub_quota.includes('OTHER') ? 'OTHER'
    : r.sub_quota.includes('Biological') ? 'BIO_PHYS' : r.sub_quota.includes('Commerce') ? 'COMMERCE' : 'X')) : 'ALL';
  const gid = (insGroup.get(oy, g, r.sub_quota || null) as { group_id: number }).group_id;
  for (const d of DISTRICTS) {
    const v = r[d.name].trim();
    const status = v === 'NQC' ? 'NQC' : 'VALUE';
    insCut.run(gid, d.code, status, status === 'VALUE' ? toE4(v) : null, fact('CUTOFF', HB, Number(r.printed_page)));
    cut2425++;
  }
}
db.exec('COMMIT');

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
log(`- Database size with two intake years: ${(pageCount * pageSize / 1024 / 1024).toFixed(2)} MB (D1 free limit: 500 MB per database)`);
fs.writeFileSync(path.join(import.meta.dirname, 'validation-report.md'), report.join('\n') + '\n');
process.exit(fails || accepted.length || unmatched.length ? 1 : 0);
