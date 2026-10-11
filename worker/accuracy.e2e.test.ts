// Data-accuracy suite for the rule engine (ACC-xxx). Every expected value here is computed straight from the source CSVs
// in data/ugc/ (or from the business-rule text of ZP-DOC-03), never from the engine's own build pipeline, so a wrong
// mapping, a dropped cut-off or a banding regression shows up as a difference between two independent readings.
// Local only: reads files on disk, no network.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readCsv } from '../tools/seed/csv.ts';
import app from './index.ts';
import { assessOffering, book, districtIndex, parseProfile } from './rulebook.ts';
import { BANDING, band, type Band } from '../shared/banding.ts';
import { evaluate, type Grade, type StreamCode } from '../shared/rules.ts';
import type { ProfileInput, ResultsResponse } from '../shared/api.ts';

// ------------------------------------------------------------------------------------------------ oracle inputs
const DATA = path.resolve(import.meta.dirname, '..', 'data', 'ugc');
const unicodes = readCsv(path.join(DATA, '2025-2026', 'unicodes.csv'));
const handbook = readCsv(path.join(DATA, '2025-2026', 'courses_requirements.csv'));
const copOfferings = readCsv(path.join(DATA, '2025-2026', 'offerings_2025_2026.csv'));
const copCells = readCsv(path.join(DATA, '2025-2026', 'cutoffs_2025_2026.csv'));
const prev = readCsv(path.join(DATA, '2024-2025', 'cutoffs_2024_2025.csv'));

/** Exact decimal string -> ten-thousandths, by string arithmetic (no float), the oracle's own parser. */
function e4(text: string): number {
  const m = text.trim().match(/^(-?)(\d+)\.(\d{4})$/);
  if (!m) throw new Error(`not a four-decimal Z: ${text}`);
  return (m[1] ? -1 : 1) * (Number(m[2]) * 10000 + Number(m[3]));
}
const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const offeringByCode = new Map(book.offerings.map(o => [o.uniCode, o]));
const districtNames = book.districts.map(d => d.name);
const yearOf = (uni: string, group: string, academicYear: string) =>
  offeringByCode.get(uni)?.groups.find(g => g.code === group)?.years.find(y => y.academicYear === academicYear);

// Independent 2025/26 column -> Uni-Code mapping: only columns whose printed course AND university match exactly one
// Uni-Code row (after removing spaces/punctuation), and only single-group columns. Anything fuzzy is left out.
const oracle2526: { uni: string; offeringId: string }[] = [];
for (const o of copOfferings) {
  if (o.stream_in_header || /\s-\s?[AB]\b/.test(o.course_name)) continue;
  const hits = unicodes.filter(u => compact(u.course) === compact(o.course_name) && compact(u.university) === compact(o.university));
  if (hits.length === 1) oracle2526.push({ uni: hits[0].uni_code, offeringId: o.offering_id });
}
const cellsByOffering = new Map<string, Record<string, string>[]>();
for (const c of copCells) (cellsByOffering.get(c.offering_id) ?? cellsByOffering.set(c.offering_id, []).get(c.offering_id)!).push(c);

// ------------------------------------------------------------------------------------------------ oracle banding
/** BR-030 to BR-032 written straight from the ZP-DOC-03 table, independently of shared/banding.ts. */
function oracleBand(z: number, history: { examYear: number; zE4: number | null }[]): Band {
  const recent = [...history].sort((a, b) => b.examYear - a.examYear).slice(0, 5);       // BR-032: five most recent
  const C = recent.filter(y => y.zE4 !== null) as { examYear: number; zE4: number }[];  // BR-034: NQC excluded
  if (C.length === 0) return 'NOT_ENOUGH_DATA';                                          // BR-030
  const m = C.length >= 3 ? 0 : 1000;                                                    // BR-031
  const max = Math.max(...C.map(c => c.zE4)), min = Math.min(...C.map(c => c.zE4)), cl = C[0].zE4;
  if (z >= max + m) return 'SAFE';
  if (z >= cl) return 'LIKELY';
  if (z >= min - 500) return 'REACH';
  return 'OUT_OF_RANGE';
}
const historyFor = (uni: string, group: string, district: string) =>
  offeringByCode.get(uni)!.groups.find(g => g.code === group)!.years.map(y => ({ examYear: y.examYear, zE4: y.zE4[districtIndex.get(district)!] }));

// ------------------------------------------------------------------------------------------------ typical students
const allA = (...s: string[]) => Object.fromEntries(s.map(x => [x, 'A'])) as Record<string, Grade>;
const TYPICAL: Record<StreamCode, Record<string, Grade>[]> = {
  PHYS: [allA('CMATH', 'PHY', 'CHEM'), allA('CMATH', 'PHY', 'ICT')],
  BIO: [allA('BIO', 'CHEM', 'PHY'), allA('BIO', 'CHEM', 'AGRI')],
  // Commerce combos include Business Studies, which is not an Arts basket subject: ACC/ECON/ICT, for example, is ALSO a
  // valid Arts basket combination (all three are Basket 01 subjects), so it is not "typical Commerce only".
  COMMERCE: [allA('ACC', 'BSTUD', 'ECON'), allA('BSTUD', 'ECON', 'ICT'), allA('ACC', 'BSTUD', 'ICT')],
  // Music, Dance and Drama degrees need that subject itself, so the Arts set includes one combination with each.
  ARTS: [allA('SIN', 'HIST', 'GEOG'), allA('ECON', 'GEOG', 'POLSCI'), allA('ENG', 'HIST', 'ART'),
    allA('SIN', 'HIST', 'MUSIC'), allA('SIN', 'HIST', 'DANCE'), allA('SIN', 'HIST', 'DRAMA')],
  ET: [allA('ET', 'SFT', 'ICT'), allA('ET', 'SFT', 'ECON')],
  BST: [allA('BST', 'SFT', 'AGRI'), allA('BST', 'SFT', 'ICT')],
};
const STREAM_NAME: Record<string, StreamCode> = { 'Biological Science': 'BIO', 'Physical Science': 'PHYS', Commerce: 'COMMERCE',
  Arts: 'ARTS', 'Engineering Technology': 'ET', 'Biosystems Technology': 'BST' };
const courseVerdict = (code: string, stream: StreamCode, al: Record<string, Grade>, group?: string) => {
  const c = book.courses[code];
  const rule = (group && c.groups?.[group]) || { al: c.al, ol: c.ol };
  return evaluate(rule.al, rule.ol ?? undefined, { stream, al, ol: { ENG_OL: 'A', MATH_OL: 'A', SCI_OL: 'A', SIN_OL: 'A', TAM_OL: 'A' } });
};

async function results(p: ProfileInput): Promise<ResultsResponse> {
  const r = await app.request('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }, {} as Env);
  expect(r.status).toBe(200);
  return r.json() as Promise<ResultsResponse>;
}

// ================================================================================================ 1. coverage
describe('ACC 1: every official Uni-Code and its handbook facts are known to the engine', () => {
  it('ACC-001 all 255 Uni-Codes in unicodes.csv are offerings in the rulebook, with no extras or duplicates', () => {
    expect(unicodes).toHaveLength(255);
    const csv = new Set(unicodes.map(u => u.uni_code));
    expect(csv.size).toBe(255);
    expect(book.offerings).toHaveLength(255);
    expect(new Set(book.offerings.map(o => o.uniCode))).toEqual(csv);
  });
  it('ACC-002 each offering has the institution printed for its Uni-Code (handbook Uni-Code list)', () => {
    const bad = unicodes.filter(u => compact(offeringByCode.get(u.uni_code)!.institution) !== compact(u.university));
    expect(bad.map(u => u.uni_code)).toEqual([]);
  });
  it('ACC-003 course code = first three characters of the Uni-Code, and every course has a reconciled rule (FR-201)', () => {
    expect(book.rulesStatus).toBe('RECONCILED');
    for (const o of book.offerings) {
      expect(o.courseCode).toBe(o.uniCode.slice(0, 3));
      expect(book.courses[o.courseCode], o.uniCode).toBeDefined();
    }
  });
  it('ACC-004 proposed intake equals the handbook value for every Uni-Code', () => {
    const bad = handbook.filter(h => offeringByCode.get(h.uni_code)!.proposedIntake !== (Number(h.proposed_intake) || null));
    expect(bad.map(h => `${h.uni_code}: csv ${h.proposed_intake} vs engine ${offeringByCode.get(h.uni_code)!.proposedIntake}`)).toEqual([]);
  });
  it('ACC-005 aptitude-test flag equals the handbook value for every Uni-Code', () => {
    const bad = handbook.filter(h => offeringByCode.get(h.uni_code)!.hasAptitudeTest !== h.aptitude_test.startsWith('Y'));
    expect(bad.map(h => h.uni_code)).toEqual([]);
  });
  it('ACC-006 merit-only (BR-014) offerings are exactly the handbook "All Island Merit (100%)" rows (22)', () => {
    const csv = handbook.filter(h => h.selection_basis.startsWith('All Island Merit')).map(h => h.uni_code).sort();
    expect(csv).toHaveLength(22);
    expect(book.offerings.filter(o => o.meritOnly).map(o => o.uniCode).sort()).toEqual(csv);
  });
});

// ================================================================================================ 2. districts
describe('ACC 2: districts (BR-007)', () => {
  it('ACC-010 exactly 25 districts, unique codes, names equal the 25 district names of the COP table', () => {
    expect(book.districts).toHaveLength(25);
    expect(new Set(book.districts.map(d => d.code)).size).toBe(25);
    expect(new Set(districtNames)).toEqual(new Set(copCells.map(c => c.district)));
  });
  it('ACC-011 exactly the 16 educationally disadvantaged districts named in BR-007 are flagged', () => {
    const br007 = ['NUWARA ELIYA', 'HAMBANTOTA', 'JAFFNA', 'KILINOCHCHI', 'MANNAR', 'MULLAITIVU', 'VAVUNIYA', 'TRINCOMALEE',
      'BATTICALOA', 'AMPARA', 'PUTTALAM', 'ANURADHAPURA', 'POLONNARUWA', 'BADULLA', 'MONARAGALA', 'RATNAPURA'];
    expect(book.districts.filter(d => d.disadvantaged).map(d => d.name).sort()).toEqual(br007.sort());
  });
  it('ACC-012 every cut-off year carries exactly one value per district (25)', () => {
    for (const o of book.offerings) for (const g of o.groups) for (const y of g.years) expect(y.zE4, `${o.uniCode} ${g.code} ${y.academicYear}`).toHaveLength(25);
  });
  it('ACC-013 profile validation accepts all 25 district codes and rejects an unknown one', () => {
    for (const d of book.districts) expect(parseProfile({ stream: 'PHYS', district: d.code, zE4: 10000, al: allA('CMATH', 'PHY', 'CHEM') })).not.toHaveProperty('error');
    expect(parseProfile({ stream: 'PHYS', district: 'XYZ', zE4: 10000, al: allA('CMATH', 'PHY', 'CHEM') })).toMatchObject({ field: 'district' });
  });
});

// ================================================================================================ 3. cut-offs
describe('ACC 3: the cut-off the engine uses equals the official table', () => {
  it('ACC-020 2025/26: every cell of every independently matched COP column equals the engine value (value or NQC)', () => {
    expect(oracle2526.length).toBeGreaterThanOrEqual(200);            // coverage floor for the independent matcher
    const diffs: string[] = [];
    let checked = 0;
    for (const { uni, offeringId } of oracle2526) {
      const y = yearOf(uni, 'ALL', '2025/2026');
      if (!y) { diffs.push(`${uni}: no 2025/26 ALL group in engine`); continue; }
      for (const c of cellsByOffering.get(offeringId) ?? []) {
        const want = c.status === 'value' ? e4(c.cutoff_z) : null;
        const got = y.zE4[districtNames.indexOf(c.district)];
        checked++;
        if (got !== want) diffs.push(`${uni} ${c.district}: csv ${c.cutoff_z || 'NQC'} vs engine ${got}`);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(200 * 25);
    expect(diffs).toEqual([]);
  });

  // A spread-out sample of named course/district pairs (every k-th matched column, rotating district).
  const step = Math.max(1, Math.floor(oracle2526.length / 24));
  const sample = Array.from({ length: 24 }, (_, i) => {
    const { uni, offeringId } = oracle2526[(i * step) % oracle2526.length];
    const district = districtNames[(i * 7) % 25];
    const cell = (cellsByOffering.get(offeringId) ?? []).find(c => c.district === district)!;
    return { id: `ACC-${String(21 + i).padStart(3, '0')}`, uni, district, cell };
  });
  it.each(sample)('$id 2025/26 cut-off $uni in $district equals the COP cell', ({ uni, district, cell }) => {
    expect(cell).toBeDefined();
    const want = cell.status === 'value' ? e4(cell.cutoff_z) : null;
    expect(yearOf(uni, 'ALL', '2025/2026')!.zE4[districtNames.indexOf(district)]).toBe(want);
  });

  it('ACC-050 2024/25: every single-group row of the handbook Section 9 table equals the engine value', () => {
    const diffs: string[] = [];
    let checked = 0;
    for (const r of prev.filter(r => r.uni_code_2025_26 && !r.sub_quota)) {
      const y = yearOf(r.uni_code_2025_26, 'ALL', '2024/2025');
      if (!y) { diffs.push(`${r.uni_code_2025_26}: no 2024/25 ALL year in engine`); continue; }
      for (const [i, d] of districtNames.entries()) {
        const v = r[d].trim();
        checked++;
        if (y.zE4[i] !== (v === 'NQC' ? null : e4(v))) diffs.push(`${r.uni_code_2025_26} ${d}: csv ${v} vs engine ${y.zE4[i]}`);
      }
    }
    expect(checked).toBeGreaterThan(150 * 25);
    expect(diffs).toEqual([]);
  });
  it('ACC-051 2025/26: the number of numeric and NQC cells in the engine equals the COP table (no cell dropped)', () => {
    let num = 0, nqc = 0;
    for (const o of book.offerings) for (const g of o.groups) for (const y of g.years.filter(y => y.academicYear === '2025/2026'))
      for (const v of y.zE4) v === null ? nqc++ : num++;
    expect({ num, nqc }).toEqual({ num: copCells.filter(c => c.status === 'value').length, nqc: copCells.filter(c => c.status !== 'value').length });
  });
  it('ACC-052 2025/26: the lowest and highest published cut-offs match the COP table and BR-005 (−0.8505 to 2.7935)', () => {
    const csv = copCells.filter(c => c.status === 'value').map(c => e4(c.cutoff_z));
    const eng = book.offerings.flatMap(o => o.groups.flatMap(g => g.years.filter(y => y.academicYear === '2025/2026').flatMap(y => y.zE4)))
      .filter((v): v is number => v !== null);
    expect([Math.min(...eng), Math.max(...eng)]).toEqual([Math.min(...csv), Math.max(...csv)]);
    expect([Math.min(...csv), Math.max(...csv)]).toEqual([-8505, 27935]);
  });
  it('ACC-053 BR-035: every all-island-merit offering has one single 2025/26 cut-off for all districts', () => {
    for (const o of book.offerings.filter(o => o.meritOnly)) for (const g of o.groups) {
      const y = g.years.find(y => y.academicYear === '2025/2026')!;
      expect(new Set(y.zE4).size, `${o.uniCode} ${g.code}`).toBe(1);
    }
  });
  it('ACC-054 split selection groups (A/B, BIO/OTHER, BIO_PHYS/COMMERCE) each have their own 2025/26 column', () => {
    const split = book.offerings.filter(o => o.groups.length > 1);
    const copSplitColumns = copOfferings.filter(o => o.stream_in_header || /\s-\s?[AB]\b/.test(o.course_name));
    expect(split.reduce((n, o) => n + o.groups.length, 0)).toBe(copSplitColumns.length);
    for (const o of split) for (const g of o.groups) expect(g.years.some(y => y.academicYear === '2025/2026'), `${o.uniCode} ${g.code}`).toBe(true);
    expect(split).toHaveLength(5);
  });
});

// ================================================================================================ 4. banding
describe('ACC 4: Safe / Likely / Reach boundaries on real cut-offs (BR-030 to BR-034)', () => {
  // Real (offering, district) pairs chosen by data shape: full history and limited history.
  const pairs = book.offerings.flatMap(o => o.groups.flatMap(g => book.districts.map(d => ({ uni: o.uniCode, group: g.code, district: d.code }))));
  const n = (p: typeof pairs[number]) => historyFor(p.uni, p.group, p.district).slice(0, BANDING.maxYears).filter(y => y.zE4 !== null).length;
  const full = pairs.find(p => p.uni === '001A' && p.district === 'COL')!;
  const full2 = pairs.find(p => p.uni.startsWith('008') && p.district === 'KUR' && n(p) >= 3)!;
  const limited = pairs.find(p => n(p) === 1)!;
  const limited2 = pairs.find(p => n(p) === 2)!;
  const empty = pairs.find(p => n(p) === 0)!;

  const boundaryCases = (p: typeof full, label: string) => {
    const h = historyFor(p.uni, p.group, p.district);
    const C = h.filter(y => y.zE4 !== null).sort((a, b) => b.examYear - a.examYear).slice(0, 5) as { examYear: number; zE4: number }[];
    const m = C.length >= 3 ? 0 : 1000;
    const max = Math.max(...C.map(c => c.zE4)), min = Math.min(...C.map(c => c.zE4)), cl = C[0].zE4;
    return { label, p, h, points: [max + m, max + m - 1, cl, cl - 1, min - 500, min - 501] };
  };
  it('ACC-060 BR-032 full history: Safe at max(C), Likely at max(C) − 0.0001 and at c_l, Reach just below c_l and at min − 0.0500, Out of range below', () => {
    const { h, points: [sMax, below, cl, belowCl, reachMin, out] } = boundaryCases(full, 'full');
    expect(band(sMax, h).band).toBe('SAFE');
    expect(band(below, h).band).toBe(below >= cl ? 'LIKELY' : 'REACH');
    expect(band(cl, h).band).toBe(cl >= sMax ? 'SAFE' : 'LIKELY');
    expect(band(belowCl, h).band).toBe('REACH');
    expect(band(reachMin, h).band).toBe(reachMin >= cl ? 'LIKELY' : 'REACH');
    expect(band(out, h).band).toBe('OUT_OF_RANGE');
  });
  it.each([
    ['ACC-061 BR-032 full history, Medicine 001A Colombo', full],
    ['ACC-062 BR-032 full history, Engineering 008x Kurunegala', full2],
    ['ACC-063 BR-031 limited history n=1 (margin 0.1000)', limited],
    ['ACC-064 BR-031 limited history n=2 (margin 0.1000)', limited2],
  ] as const)('%s: engine band equals the BR-032 oracle at every boundary point', (_name, p) => {
    expect(p).toBeDefined();
    const { h, points } = boundaryCases(p, _name);
    for (const z of points) expect(band(z, h).band, `Z=${z}`).toBe(oracleBand(z, h));
  });
  it('ACC-065 BR-031 limited history: Safe needs max(C) + 0.1000; max(C) + 0.0999 is only Likely', () => {
    const h = historyFor(limited.uni, limited.group, limited.district);
    const max = Math.max(...h.filter(y => y.zE4 !== null).map(y => y.zE4!));
    expect(band(max + 1000, h).band).toBe('SAFE');
    expect(band(max + 999, h).band).toBe('LIKELY');
    expect(band(max + 1000, h).limitedHistory).toBe(true);
  });
  it('ACC-066 BR-030 / BR-034: an all-NQC history is Not enough data, and NQC years are reported, never used', () => {
    expect(empty).toBeDefined();
    const h = historyFor(empty.uni, empty.group, empty.district);
    const r = band(40000, h);
    expect(r.band).toBe('NOT_ENOUGH_DATA');
    expect(r.nqcYears.length).toBe(h.slice(0, 5).filter(y => y.zE4 === null).length);
  });
  it('ACC-067 BR-032 oracle sweep: engine band equals the oracle for every offering, group and district at 9 Z values', () => {
    const zs = [-10000, 0, 5000, 10000, 12000, 14000, 16000, 20000, 30000];
    const diffs: string[] = [];
    for (const p of pairs) {
      const h = historyFor(p.uni, p.group, p.district);
      for (const z of zs) { const a = band(z, h).band, b = oracleBand(z, h); if (a !== b) diffs.push(`${p.uni}/${p.group}/${p.district} Z=${z}: ${a} vs ${b}`); }
    }
    expect(diffs).toEqual([]);
  });
});

// ================================================================================================ 5. eligibility
describe('ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024)', () => {
  const code = (prefix: string) => book.offerings.find(o => o.courseCode === prefix)!.courseCode;
  it('ACC-070 Physical Science CMATH/PHY/CHEM is eligible for Engineering (008); a Bio student BIO/CHEM/PHY is not', () => {
    expect(courseVerdict(code('008'), 'PHYS', { CMATH: 'S', PHY: 'S', CHEM: 'S' })).toBe('ELIGIBLE');
    expect(courseVerdict(code('008'), 'BIO', allA('BIO', 'CHEM', 'PHY'))).toBe('NOT_ELIGIBLE');
  });
  it('ACC-071 Bio BIO/CHEM/PHY with two Cs is eligible for Medicine (001); a Physical Science student is not', () => {
    expect(courseVerdict(code('001'), 'BIO', { BIO: 'C', CHEM: 'C', PHY: 'S' })).toBe('ELIGIBLE');
    expect(courseVerdict(code('001'), 'BIO', { BIO: 'C', CHEM: 'S', PHY: 'S' })).toBe('NOT_ELIGIBLE');
    expect(courseVerdict(code('001'), 'PHYS', allA('CMATH', 'PHY', 'CHEM'))).toBe('NOT_ELIGIBLE');
  });
  it('ACC-072 Commerce ACC/BSTUD/ECON is eligible for Commerce (018); an Arts SIN/HIST/GEOG student is not', () => {
    expect(courseVerdict('018', 'COMMERCE', allA('ACC', 'BSTUD', 'ECON'))).toBe('ELIGIBLE');
    expect(courseVerdict('018', 'ARTS', allA('SIN', 'HIST', 'GEOG'))).toBe('NOT_ELIGIBLE');
  });
  it('ACC-073 Arts (019) follows the basket rules: SIN/HIST/GEOG eligible; Buddhism + Buddhist Civilisation is not', () => {
    expect(courseVerdict('019', 'ARTS', allA('SIN', 'HIST', 'GEOG'))).toBe('ELIGIBLE');
    expect(courseVerdict('019', 'ARTS', allA('BUDDHISM', 'BUDCIV', 'ECON'))).toBe('NOT_ELIGIBLE');
    expect(courseVerdict('019', 'ARTS', allA('ARABIC', 'PALI', 'SANSKRIT'))).toBe('NOT_ELIGIBLE');
  });
  it('ACC-074 ICT (104) needs ICT + SFT + ET/BST: an ET student is eligible, a Physical Science student is not', () => {
    expect(courseVerdict('104', 'ET', allA('ET', 'SFT', 'ICT'))).toBe('ELIGIBLE');
    expect(courseVerdict('104', 'PHYS', allA('CMATH', 'PHY', 'ICT'))).toBe('NOT_ELIGIBLE');
  });
  it('ACC-075 BR-001: a single grade below S (F) makes every course NOT_ELIGIBLE', () => {
    for (const c of Object.keys(book.courses)) expect(courseVerdict(c, 'PHYS', { CMATH: 'A', PHY: 'A', CHEM: 'F' as Grade }), c).toBe('NOT_ELIGIBLE');
  });
  it('ACC-076 FR-113: courses with an O/L rule return NEEDS_OL (not ELIGIBLE) until O/L grades are given', () => {
    const withOl = Object.entries(book.courses).filter(([, c]) => c.ol);
    expect(withOl.length).toBeGreaterThan(0);
    for (const [k, c] of withOl) {
      for (const [stream, combos] of Object.entries(TYPICAL)) for (const al of combos) {
        const v = evaluate(c.al, c.ol ?? undefined, { stream: stream as StreamCode, al });
        expect(v, `${k} ${stream}`).not.toBe('ELIGIBLE');
      }
    }
  });
  it('ACC-077 handbook "eligible streams": a single-stream course never admits typical students of a different stream', () => {
    const diffs: string[] = [];
    for (const h of handbook) {
      const own = STREAM_NAME[h.eligible_streams.trim()];
      if (!own) continue;                                                       // multi-stream courses are skipped here
      for (const [stream, combos] of Object.entries(TYPICAL) as [StreamCode, Record<string, Grade>[]][]) {
        if (stream === own) continue;
        for (const al of combos) for (const g of offeringByCode.get(h.uni_code)!.groups)
          if (courseVerdict(h.course_code, stream, al, g.code) !== 'NOT_ELIGIBLE') diffs.push(`${h.uni_code} (${h.eligible_streams}) admits ${stream} ${Object.keys(al).join('/')}`);
      }
    }
    expect(diffs).toEqual([]);
  });
  it('ACC-078 handbook "eligible streams": every single-stream course admits at least one typical all-A student of that stream', () => {
    const none: string[] = [];
    for (const h of handbook) {
      const own = STREAM_NAME[h.eligible_streams.trim()];
      if (!own) continue;
      const ok = TYPICAL[own].some(al => offeringByCode.get(h.uni_code)!.groups.some(g => courseVerdict(h.course_code, own, al, g.code) === 'ELIGIBLE'));
      if (!ok) none.push(`${h.uni_code} ${h.course_name} (${h.eligible_streams})`);
    }
    expect(none).toEqual([]);
  });
});

// ================================================================================================ 6. invalid input
describe('ACC 6: invalid profiles are rejected on the server (FR-102, BR-005)', () => {
  const base = { stream: 'PHYS', district: 'COL', zE4: 15000, al: allA('CMATH', 'PHY', 'CHEM') };
  it.each([
    ['ACC-080 two subjects', { ...base, al: allA('CMATH', 'PHY') }, 'al'],
    ['ACC-081 four subjects', { ...base, al: allA('CMATH', 'PHY', 'CHEM', 'ICT') }, 'al'],
    ['ACC-082 grade outside A/B/C/S', { ...base, al: { CMATH: 'A', PHY: 'A', CHEM: 'F' } }, 'al'],
    ['ACC-083 unknown stream', { ...base, stream: 'SCIENCE' }, 'stream'],
    ['ACC-084 Z above +4.0000 (BR-005)', { ...base, zE4: 40001 }, 'zE4'],
    ['ACC-085 Z below −4.0000 (BR-005)', { ...base, zE4: -40001 }, 'zE4'],
    ['ACC-086 Z not in whole ten-thousandths', { ...base, zE4: 15000.5 }, 'zE4'],
  ])('%s is rejected', async (_n, body, field) => {
    expect(parseProfile(body)).toMatchObject({ field });
    const r = await app.request('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, {} as Env);
    expect(r.status).toBe(400);
  });
  it('ACC-087 strict mode rejects a subject code that is not an A/L subject (O/L code or made-up)', () => {
    expect(parseProfile({ ...base, al: allA('CMATH', 'PHY', 'ENG_OL') }, true)).toMatchObject({ field: 'al' });
    expect(parseProfile({ ...base, al: allA('CMATH', 'PHY', 'XYZ') }, true)).toMatchObject({ field: 'al' });
  });
  it('ACC-088 Z boundaries ±4.0000 are accepted (BR-005)', () => {
    expect(parseProfile({ ...base, zE4: 40000 })).not.toHaveProperty('error');
    expect(parseProfile({ ...base, zE4: -40000 })).not.toHaveProperty('error');
  });
});

// ================================================================================================ 7. results invariants
describe('ACC 7: /api/results invariants (FR-205)', () => {
  const profiles: ProfileInput[] = [
    { stream: 'PHYS', district: 'COL', zE4: 16000, al: allA('CMATH', 'PHY', 'CHEM') },
    { stream: 'BIO', district: 'JAF', zE4: 13000, al: { BIO: 'B', CHEM: 'C', PHY: 'C' } },
    { stream: 'ARTS', district: 'BAD', zE4: 9000, al: allA('SIN', 'HIST', 'GEOG') },
    { stream: 'COMMERCE', district: 'KUR', zE4: 11000, al: allA('ACC', 'BSTUD', 'ECON') },
  ];
  it.each(profiles.map((p, i) => [`ACC-${90 + i}`, p] as const))('%s no course/group appears in two bands, counts add up, hidden is disjoint (%o)', async (_id, p) => {
    const r = await results(p);
    const keys = r.offerings.map(o => `${o.uniCode}|${o.group}`);
    expect(new Set(keys).size).toBe(keys.length);
    const sum = Object.values(r.counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.offerings.length);
    for (const b of Object.keys(r.counts) as Band[]) expect(r.offerings.filter(o => o.band === b).length).toBe(r.counts[b]);
    const shown = new Set(r.offerings.map(o => o.uniCode));
    expect(r.hidden.filter(h => shown.has(h.uniCode))).toEqual([]);
    expect(shown.size + r.hidden.length).toBe(255);                       // every Uni-Code is either listed or explained
  });
  it('ACC-094 a Bio student never sees Engineering (008) in results; it is in "hidden" with its handbook reason', async () => {
    const r = await results(profiles[1]);
    expect(r.offerings.filter(o => o.courseCode === '008')).toEqual([]);
    expect(r.hidden.filter(h => h.uniCode.startsWith('008')).length).toBe(book.offerings.filter(o => o.courseCode === '008').length);
  });
  it('ACC-095 results band for each listed offering equals the BR-032 oracle on that district\'s official history', async () => {
    for (const p of profiles) {
      const r = await results(p);
      for (const o of r.offerings) expect(o.band, `${o.uniCode} ${o.group}`).toBe(oracleBand(p.zE4, historyFor(o.uniCode, o.group, p.district)));
    }
  });
});

// ================================================================================================ 8. monotonicity
describe('ACC 8: a higher Z never gives a worse outcome (property over a grid)', () => {
  const RANK: Record<Band, number> = { NOT_ENOUGH_DATA: -1, OUT_OF_RANGE: 0, REACH: 1, LIKELY: 2, SAFE: 3 };
  const zGrid = Array.from({ length: 41 }, (_, i) => -10000 + i * 1000);     // −1.0000 to +3.0000 step 0.1000
  const students: [StreamCode, Record<string, Grade>][] = [['PHYS', allA('CMATH', 'PHY', 'CHEM')], ['BIO', allA('BIO', 'CHEM', 'PHY')],
    ['COMMERCE', allA('ACC', 'BSTUD', 'ECON')], ['ARTS', allA('SIN', 'HIST', 'GEOG')]];
  it('ACC-100 for every district and 4 streams: Safe count, Safe+Likely and Safe+Likely+Reach never fall as Z rises; eligibility never changes', () => {
    const fails: string[] = [];
    for (const [stream, al] of students) for (const d of book.districts) {
      let prev: number[] | null = null, prevEligible = -1;
      // Subject rules do not depend on Z or district: judge once with the engine, then band each grid point.
      const groups = book.offerings.flatMap(o => assessOffering(o, { stream, district: d.code, zE4: 0, al }).groups.filter(g => g.result)
        .map(g => g.group.years.map(y => ({ examYear: y.examYear, zE4: y.zE4[districtIndex.get(d.code)!] }))));
      for (const zE4 of zGrid) {
        const c = { SAFE: 0, LIKELY: 0, REACH: 0, OUT_OF_RANGE: 0, NOT_ENOUGH_DATA: 0 };
        let eligible = 0;
        for (const h of groups) { c[band(zE4, h).band]++; eligible++; }
        const cum = [c.SAFE, c.SAFE + c.LIKELY, c.SAFE + c.LIKELY + c.REACH];
        if (prev && cum.some((v, i) => v < prev![i])) fails.push(`${stream} ${d.code} Z=${zE4}: ${cum} after ${prev}`);
        if (prevEligible >= 0 && eligible !== prevEligible) fails.push(`${stream} ${d.code} Z=${zE4}: eligible ${eligible} vs ${prevEligible}`);
        prev = cum; prevEligible = eligible;
      }
    }
    expect(fails).toEqual([]);
  }, 120_000);
  it('ACC-102 eligibility (which offerings are listed at all) is identical at Z = −1.0, 1.0 and 3.0 (engine, 4 streams, Colombo)', () => {
    for (const [stream, al] of students) {
      const listed = (zE4: number) => book.offerings.flatMap(o => assessOffering(o, { stream, district: 'COL', zE4, al }).groups
        .filter(g => g.result).map(g => `${o.uniCode}|${g.group.code}`)).join(',');
      expect(listed(-10000), stream).toBe(listed(10000));
      expect(listed(30000), stream).toBe(listed(10000));
    }
  });
  it('ACC-101 per offering: the band rank never decreases as Z rises (every offering, group, district)', () => {
    const fails: string[] = [];
    for (const o of book.offerings) for (const g of o.groups) for (const d of book.districts) {
      const h = g.years.map(y => ({ examYear: y.examYear, zE4: y.zE4[districtIndex.get(d.code)!] }));
      let last = -2;
      for (const z of zGrid) { const r = RANK[band(z, h).band]; if (r < last) fails.push(`${o.uniCode}/${g.code}/${d.code} Z=${z}`); last = r; }
    }
    expect(fails).toEqual([]);
  }, 120_000);
});
