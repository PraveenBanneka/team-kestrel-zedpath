// Compiles the student-path read model ("rulebook") from the system of record (ZP-DOC-05, Section "Deliberate
// departures"; ZP-DOC-06 ADR-002). The Worker answers every student request from this file: zero database reads
// per request, so the D1 free-plan limit of 5 million row reads a day is never at risk, even on results day.
// Run from the repo root:  node tools/rulebook/build-rulebook.ts
import fs from 'node:fs';
import path from 'node:path';
import { loadDatabase } from '../seed/load.ts';
import { DISTRICTS, STREAMS } from '../seed/reference.ts';
import type { Rule } from '../../shared/rules.ts';
import type { Rulebook } from '../../shared/rulebook.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const RULES = path.join(ROOT, 'data', 'rules', 'rules-2025-2026.json');
const OUT = path.join(ROOT, 'worker', 'generated', 'rulebook-2025-2026.json');
const YEAR = '2025/2026';

const { db } = loadDatabase();
type RulesFile = { subjects: Record<string, string>; courses: Record<string, { name: string; al: Rule; ol: Rule | null;
  groups: Record<string, { al: Rule; ol: Rule | null }> | null; other: string | null; page: number; quote: string }> };
const rules: RulesFile | null = fs.existsSync(RULES) ? JSON.parse(fs.readFileSync(RULES, 'utf8')) : null;

const offerings = db.prepare(`
  SELECT o.uni_code, y.course_code, c.name_en AS course, i.name_en AS institution, y.proposed_intake, y.duration_text,
         y.selection_basis, y.has_aptitude_test, y.other_requirements, y.offering_year_id,
         (SELECT page FROM citation WHERE fact_id = y.fact_id LIMIT 1) AS page
  FROM offering_year y JOIN offering o USING (course_code, institution_letter)
  JOIN course c USING (course_code) JOIN institution i ON i.letter = y.institution_letter
  WHERE y.academic_year = ? AND y.is_suspended = 0 ORDER BY o.uni_code`).all(YEAR) as Record<string, any>[];

// Cut-off history per (Uni-Code, group, intake year): one value per district in DISTRICTS order (null = NQC).
const history = db.prepare(`
  SELECT o.uni_code, g.group_code, g.label_en, y.academic_year, i.exam_year, c.district_code, c.min_z_e4,
         (SELECT page FROM citation WHERE fact_id = c.fact_id LIMIT 1) AS page,
         (SELECT d.title FROM citation ci JOIN source_document d USING (source_id) WHERE ci.fact_id = c.fact_id LIMIT 1) AS source,
         (SELECT d.edition FROM citation ci JOIN source_document d USING (source_id) WHERE ci.fact_id = c.fact_id LIMIT 1) AS edition
  FROM cutoff c JOIN selection_group g USING (group_id) JOIN offering_year y USING (offering_year_id)
  JOIN intake_year i USING (academic_year) JOIN offering o USING (course_code, institution_letter)`).all() as Record<string, any>[];

const shortYear = (edition: string) => edition.replace(/^.*?(\d{4})\/\d{2}(\d{2}).*$/, '$1/$2');
const dIndex = new Map(DISTRICTS.map((d, i) => [d.code, i]));
const groups = new Map<string, Rulebook['offerings'][number]['groups'][number]>();
for (const h of history) {
  const key = `${h.uni_code}|${h.group_code}`;
  if (!groups.has(key)) groups.set(key, { code: h.group_code, label: h.label_en, years: [] });
  const g = groups.get(key)!;
  let y = g.years.find(v => v.academicYear === h.academic_year);
  // Exact citation label: the handbook's previous-year table, or that year's own official cut-off table.
  const sourceLabel = String(h.source).startsWith('Admission')
    ? `UGC handbook ${shortYear(h.edition)}, Section 9`
    : `UGC cut-off table ${shortYear(h.edition)}`;
  if (!y) { y = { academicYear: h.academic_year, examYear: h.exam_year, source: h.source, sourceLabel, page: h.page, zE4: Array(DISTRICTS.length).fill(null) }; g.years.push(y); }
  y.zE4[dIndex.get(h.district_code)!] = h.min_z_e4;
}

// Other routes: verbatim official requirements, timing and costs (data/routes/, researched 2026-10-05).
const ROUTES_FILE = path.join(ROOT, 'data', 'routes', 'routes-2026-10-05.json');
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function latestDate(text: string): string | null {                       // "12 October 2026" or "12.10.2026" -> ISO
  const ds: string[] = [];
  for (const m of text.matchAll(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi))
    ds.push(`${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  for (const m of text.matchAll(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g)) ds.push(`${m[3]}-${m[2]}-${m[1]}`);
  return ds.sort().at(-1) ?? null;
}
const rawRoutes: any[] = fs.existsSync(ROUTES_FILE) ? JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8')).routes : [];
const lkr = (n: unknown) => `Rs ${Number(n).toLocaleString('en-LK')}`;
const routes: Rulebook['routes'] = rawRoutes.map(r => ({
  id: r.id, group: r.route_group, name: r.name, provider: r.provider,
  duration: r.duration && r.duration !== 'None' ? String(r.duration) : null,
  costText: r.cost_min_lkr != null ? (r.cost_max_lkr != null && r.cost_max_lkr !== r.cost_min_lkr ? `${lkr(r.cost_min_lkr)} to ${lkr(r.cost_max_lkr)}` : lkr(r.cost_min_lkr)) : null,
  intakeTiming: r.intake_timing ?? null, requirements: r.entry_requirements_text, officialUrl: r.official_url ?? null,
  sourceUrl: r.source_url, sourceLocator: r.source_locator, retrievedOn: r.retrieved_on, warning: r.notes ?? null,
  closesOn: r.intake_timing ? latestDate(String(r.intake_timing)) : null, openAtRetrieval: /\bOPEN\b/.test(String(r.intake_timing ?? '')),
}));

const book: Rulebook = {
  routes,
  academicYear: YEAR,
  generatedAt: new Date().toISOString(),
  rulesStatus: rules ? 'RECONCILED' : 'MISSING',
  districts: DISTRICTS.map(d => ({ code: d.code, name: d.name, disadvantaged: d.disadvantaged })),
  streams: STREAMS.map(s => ({ code: s.code as Rulebook['streams'][number]['code'], name: s.name })),
  subjects: rules ? Object.entries(rules.subjects).map(([code, name]) => ({ code, name })) : [],
  sources: (db.prepare('SELECT source_id, title, edition, sha256 FROM source_document').all() as Record<string, any>[])
    .map(s => ({ id: String(s.source_id), title: s.title, edition: s.edition, sha256: s.sha256 })),
  courses: rules ? rules.courses : {},
  offerings: offerings.map(o => ({
    uniCode: o.uni_code, courseCode: o.course_code, course: o.course, institution: o.institution,
    proposedIntake: o.proposed_intake, duration: o.duration_text, meritOnly: o.selection_basis === 'MERIT_ONLY',
    hasAptitudeTest: o.has_aptitude_test === 1, other: o.other_requirements, page: o.page,
    // Only selection groups that exist in the current intake are offered. A group seen only in earlier years (e.g. MIT
    // before it was split by stream in 2023/24) is not comparable with today's split groups, so its history is left out.
    groups: [...groups.entries()].filter(([k, g]) => k.startsWith(`${o.uni_code}|`) && g.years.some(y => y.academicYear === YEAR))
      .map(([, g]) => ({ ...g, years: g.years.sort((a, b) => b.examYear - a.examYear) })),
  })),
};

const missingRules = rules ? book.offerings.filter(o => !rules.courses[o.courseCode]).map(o => o.uniCode) : [];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(book));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`rulebook ${YEAR}: ${book.offerings.length} offerings, ${groups.size} selection groups, rules ${book.rulesStatus}` +
  `${missingRules.length ? `, offerings without rules: ${missingRules.join(' ')}` : ''}, ${kb} KB -> ${path.relative(ROOT, OUT)}`);
if (missingRules.length) process.exit(1);
