// Loads the verified UGC data (data/ugc/) into a fresh in-memory SQLite database built from migrations/*.sql.
// Shared by validate-schema.ts (proves the design) and tools/rulebook/build-rulebook.ts (compiles the read model),
// so both always use exactly the same, tested loading logic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readCsv } from './csv.ts';
import { DISTRICTS, STREAMS, INSTITUTION_KIND, INSTITUTION_ALIASES } from './reference.ts';

export function loadDatabase() {
  const ROOT = path.resolve(import.meta.dirname, '..', '..');
  const DATA = path.join(ROOT, 'data', 'ugc');
  const NOW = '2026-10-05T00:00:00Z';
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(path.join(ROOT, 'migrations', '0001_initial_schema.sql'), 'utf8'));

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
    VALUES ('University Grants Commission', ?, ?, ?, 'EN', ?, ?, ?, ?) RETURNING source_id`);
  const hbSha = sha(path.join(ROOT, 'student_handbook_english.pdf')) ?? '8b9cc7b24ed2a10ed19c22a1e12d0a9336c0db15f1623ea2aca35334e005c93d';
  const copSha = sha(path.join(ROOT, 'COP_2025_2026-ENGLISH_Final.pdf')) ?? 'e1914bfbd287774c7879b7758eff9349c7a4ea40df4ca2ae9db92ac605e88ba0';
  const HB = (insSource.get('Admission to Undergraduate Courses of the Universities in Sri Lanka', 'Academic year 2025/2026', null,
    hbSha, 'sources/ugc/handbook-2025-2026-en.pdf', 'https://ugc.ac.lk/downloads/admissions/', NOW) as { source_id: number }).source_id;
  const COP = (insSource.get('Minimum "Z" Scores for selection to various Courses of Study of Universities, in respect of each district',
    'Academic year 2025/2026', '2026-07-31', copSha, 'sources/ugc/cop-2025-2026-en.pdf', 'https://ugc.ac.lk/downloads/admissions/', NOW) as { source_id: number }).source_id;

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

  // ---------------------------------------------------------------- 2021/22 to 2023/24 (official UGC cut-off tables)
  // Each historical column is linked to its 2025/26 Uni-Code by data/ugc/offering_crosswalk.csv (exact, normalised or
  // documented rename); columns of discontinued courses have no Uni-Code and are skipped.
  const crosswalk = readCsv(path.join(DATA, 'offering_crosswalk.csv'));
  const manifest = readCsv(path.join(DATA, 'sources_manifest.csv'));
  const history: Record<string, { exam: number; loaded: number; skipped: number }> = {};
  for (const [year, exam, folder] of [['2023/2024', 2023, '2023-2024'], ['2022/2023', 2022, '2022-2023'], ['2021/2022', 2021, '2021-2022']] as const) {
    db.prepare('INSERT INTO intake_year VALUES (?, ?)').run(year, exam);
    const m = manifest.find(r => r.academic_year === year && /^pdfs\/COP_/.test(r.local_file) && !/_j\.pdf$|5TH|before|ENGLISH\.pdf$/i.test(r.local_file))!;
    const src = (insSource.get(`Minimum "Z" Scores for selection to various Courses of Study of Universities, in respect of each district`,
      `Academic year ${year}`, null, m.sha256, `sources/ugc/cop-${folder}-en.pdf`, m.url, NOW) as { source_id: number }).source_id;
    const offs = new Map(readCsv(path.join(DATA, folder, `offerings_${folder.replace('-', '_')}.csv`)).map(o => [o.offering_id, o]));
    const uniOf = new Map<string, string>();
    for (const c of crosswalk.filter(c => c.year === year && c.uni_code_2025_26)) for (const id of c.offering_ids.split(';')) uniOf.set(id.trim(), c.uni_code_2025_26);
    const stats = { exam, loaded: 0, skipped: 0 };
    db.exec('BEGIN');
    for (const cell of readCsv(path.join(DATA, folder, `cutoffs_${folder.replace('-', '_')}.csv`))) {
      const uni = uniOf.get(cell.offering_id);
      if (!uni) { stats.skipped++; continue; }
      const o = offs.get(cell.offering_id)!;
      const [cc, letter] = [uni.slice(0, 3), uni.slice(3)];
      let oy = (db.prepare(`SELECT offering_year_id FROM offering_year WHERE course_code=? AND institution_letter=? AND academic_year=?`)
        .get(cc, letter, year) as { offering_year_id: number } | undefined)?.offering_year_id;
      if (!oy) oy = (insOY.get(cc, letter, year, null, null, o.all_island_merit_star === '1' ? 'MERIT_ONLY' : 'QUOTA',
        o.aptitude_test_hash === '1' ? 1 : 0, null, fact('OFFERING_YEAR', src, Number(cell.page_number))) as { offering_year_id: number }).offering_year_id;
      const g = groupCode(o);
      const key = `${uni}|${year}|${g}`;
      if (!groupId.has(key)) groupId.set(key, (insGroup.get(oy, g, g === 'ALL' ? null : o.course_name) as { group_id: number }).group_id);
      const status = cell.status === 'value' ? 'VALUE' : 'NQC';
      insCut.run(groupId.get(key)!, districtByName.get(cell.district)!, status, status === 'VALUE' ? toE4(cell.cutoff_z) : null,
        fact('CUTOFF', src, Number(cell.page_number)));
      stats.loaded++;
    }
    db.exec('COMMIT');
    history[year] = stats;
  }

  return { db, HB, COP, NOW, fact, mapping, unmatched, fuzzy, cut2526, cut2425, skipped2425, history };
}
