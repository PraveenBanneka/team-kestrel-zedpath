// Data-integrity checks over the curated read-model data compiled into the Worker (DAT-001..):
// data/routes (other paths: private degrees, diplomas, vocational, job exams, scholarships, retry), data/journey (UGC
// steps), data/alerts (notices), data/degrees (syllabi), worker/generated (the bundled rulebook + journey), the sample
// group chats (shared/group-samples.ts) and the interface dictionaries (src/i18n). Reads local files only; no network.
// Trust rules checked: every number links to a source, no invented UGC dates, only official https links, nothing on the
// blocked-host list, sample content labelled as sample, Sinhala and Tamil present wherever English is.
// Real data problems found on 2026-10-12 are pinned in KNOWN (exact list), so a new problem OR a fix fails the test
// and the list gets updated deliberately. Details: tools/e2e/results/data-integrity.md.
import fs from 'node:fs';
import path from 'node:path';
import { isBlockedPage } from '../tools/research/blocked-pages.ts';
import { describe, expect, it } from 'vitest';
import { SYLLABI } from './syllabi.ts';
import { sampleKey, samplesFor } from '../shared/group-samples.ts';
import { en } from '../src/i18n/en.ts';
import { si } from '../src/i18n/si.ts';
import { ta } from '../src/i18n/ta.ts';
import { DEMO_CONTACT, DEMO_USERNAME } from '../src/demo.ts';
import { HANDBOOK_URL } from '../shared/ask.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));

type Route = Record<string, string | number | null> & { id: string; route_group: string; name: string; provider: string;
  official_url: string | null; source_url: string; source_locator: string; retrieved_on: string; intake_timing: string | null;
  entry_requirements_text: string; cost_min_lkr: number | null; cost_max_lkr: number | null; confidence: number };
type Notice = { routeId: string; kind: string; title: string; opensOn: string | null; closesOn: string;
  age: { min: number | null; max: number | null; asOf: string; quote: string } | null;
  al: { passes: number; subjects: { all?: string[]; oneOf?: string[] } | null; quote: string } | null; ol: string | null;
  provider?: string; sourceLocator?: string; sourceUrl?: string; officialUrl?: string | null; retrievedOn?: string };
type Step = { id: string; kind: string; title: string; detail: string; when: string; page: number; quote: string; opensOn?: string | null };
type Programme = { uniCode: string; degree: string; university: string; status: string; duration: string | null;
  years?: { label: string; modules: string[] }[]; sourceUrls?: string[]; notes?: string | null };

const routesFile = json('data/routes/routes-2026-10-05.json') as { retrievedOn: string; routes: Route[] };
const ROUTES = routesFile.routes;
const stepsFile = json('data/journey/ugc-steps-2025-2026.json') as { academicYear: string; steps: Step[] };
const noticesFile = json('data/alerts/notices-2026-10-11.json') as { retrievedOn: string; notices: Notice[] };
const syllabiFile = json('data/degrees/syllabi-2026-10-05.json') as { retrievedOn: string; programmes: Programme[] };
const JOURNEY = json('worker/generated/journey-2025-2026.json') as { academicYear: string; steps: Step[]; notices: Notice[]; builtAt: string };
const RB = json('worker/generated/rulebook-2025-2026.json') as {
  routes: { id: string; group: string; name: string; provider: string; officialUrl: string | null; sourceUrl: string;
    sourceLocator: string; retrievedOn: string; intakeTiming: string | null; requirements: string; closesOn: string | null; openAtRetrieval: boolean }[];
  academicYear: string; generatedAt: string; districts: { code: string; name: string }[]; streams: { code: string; name: string }[];
  subjects: { code: string; name: string }[]; sources: { id: string; title: string; edition: string; sha256: string }[];
  courses: Record<string, { name: string; page: number; quote: string }>;
  offerings: { uniCode: string; courseCode: string; course: string; institution: string; proposedIntake: number | null; page: number;
    groups: { code: string; years: { academicYear: string; source: string; sourceLabel: string; page: number; zE4: (number | null)[] }[] }[] }[];
};
const UNICODES = read('data/ugc/2025-2026/unicodes.csv').trim().split(/\r?\n/).slice(1).map(l => l.split(','))
  .map(([code, course, university]) => ({ code, course, university }));

// The blocked hosts live in worker/syllabi.ts (not exported); read them from the source so no host name is repeated here.
const BLOCKED_HOSTS = (() => {
  const m = read('worker/syllabi.ts').match(/BLOCKED_HOSTS\s*=\s*new Set\(\[([^\]]*)\]\)/);
  if (!m) throw new Error('BLOCKED_HOSTS not found in worker/syllabi.ts');
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map(x => x[1].toLowerCase()));
})();

// Known real data problems (2026-10-12). Exact lists: fixing one, or a new one appearing, fails the pinned test.
const KNOWN = {
  notHttps: [] as string[],                              // R027 fixed 2026-10-14: https://itum.mrt.ac.lk (checked: ITUM's own site)
  offAllowList: ['syllabus 001A sourceUrls[1]'],         // a file-sharing link, not the university's own domain
};

// ---------------------------------------------------------------- helpers
const isIso = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s).toISOString().slice(0, 10) === s;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** The ways an ISO date can be written in the official text: 19.10.2026, 19 October 2026, 5 September 2026. */
const spellings = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return [`${d}.${m}.${y}`, `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`, `${d} ${MONTHS[Number(m) - 1]} ${y}`];
};
const inText = (iso: string, text: string) => spellings(iso).some(s => text.includes(s));
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
const host = (u: string) => new URL(u).hostname.toLowerCase();
const dupes = <T>(xs: T[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
const DATE_IN_TEXT = new RegExp(`\\b\\d{1,2}[./]\\d{1,2}[./]\\d{4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2}(st|nd|rd|th)? (${MONTHS.join('|')})\\b|\\b(${MONTHS.join('|')}) \\d{1,2}\\b`, 'i');

// Institutions' own domains, as listed in the data (each route's official_url), plus the UGC-named university domain.
const OWN_DOMAINS = new Set(ROUTES.map(r => r.official_url).filter((u): u is string => !!u).map(host));
const NAMED_UNIVERSITY_DOMAINS = new Set(['uom.lk']);   // University of Moratuwa's own domain (CLAUDE.md research rule 2)
const officialHost = (h: string) => h === 'ugc.ac.lk' || h.endsWith('.ac.lk') || h === 'ac.lk' || h.endsWith('.gov.lk')
  || NAMED_UNIVERSITY_DOMAINS.has(h) || [...NAMED_UNIVERSITY_DOMAINS].some(d => h.endsWith(`.${d}`)) || OWN_DOMAINS.has(h);

/** Every URL in the compiled + curated data, with where it came from. */
const ALL_URLS: { where: string; url: string }[] = [
  ...ROUTES.flatMap(r => [
    ...(r.official_url ? [{ where: `${r.id} official_url`, url: r.official_url }] : []),
    { where: `${r.id} source_url`, url: r.source_url }]),
  ...JOURNEY.notices.flatMap(n => [
    { where: `notice ${n.routeId} sourceUrl`, url: n.sourceUrl! },
    ...(n.officialUrl ? [{ where: `notice ${n.routeId} officialUrl`, url: n.officialUrl }] : [])]),
  ...RB.routes.flatMap(r => [
    ...(r.officialUrl ? [{ where: `rulebook ${r.id} officialUrl`, url: r.officialUrl }] : []),
    { where: `rulebook ${r.id} sourceUrl`, url: r.sourceUrl }]),
  ...syllabiFile.programmes.flatMap(p => (p.sourceUrls ?? []).map((url, i) => ({ where: `syllabus ${p.uniCode} sourceUrls[${i}]`, url }))),
  { where: 'HANDBOOK_URL', url: HANDBOOK_URL },
];
/** URLs written inside free text (requirements, notes, warnings, intake timing). */
const TEXT_URLS: { where: string; url: string }[] = [];
(function walk(x: unknown, where: string) {
  if (typeof x === 'string') for (const m of x.matchAll(/https?:\/\/[^\s"'()<>]+/g)) TEXT_URLS.push({ where, url: m[0].replace(/[.,;]+$/, '') });
  else if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${where}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!/url/i.test(k)) walk(v, `${where}.${k}`);
})({ routes: ROUTES, steps: stepsFile.steps, notices: noticesFile.notices, syllabi: syllabiFile.programmes, rulebook: RB }, 'data');

// ---------------------------------------------------------------- route ids and references
describe('DAT route ids and references', () => {
  it('DAT-001 every route id matches R### and the data has routes', () => {
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(ROUTES.filter(r => !/^R\d{3}$/.test(r.id)).map(r => r.id)).toEqual([]);
  });
  it('DAT-002 route ids are unique (curated file and compiled rulebook)', () => {
    expect(dupes(ROUTES.map(r => r.id))).toEqual([]);
    expect(dupes(RB.routes.map(r => r.id))).toEqual([]);
  });
  it('DAT-003 the compiled rulebook holds exactly the curated routes, same names, providers and links', () => {
    expect(RB.routes.map(r => r.id)).toEqual(ROUTES.map(r => r.id));
    for (const r of ROUTES) {
      const c = RB.routes.find(x => x.id === r.id)!;
      expect([c.group, c.name, c.provider, c.officialUrl, c.sourceUrl, c.sourceLocator, c.retrievedOn], r.id)
        .toEqual([r.route_group, r.name, r.provider, r.official_url, r.source_url, r.source_locator, r.retrieved_on]);
    }
  });
  it('DAT-004 every notice (curated and compiled) points at an existing route', () => {
    const ids = new Set(ROUTES.map(r => r.id));
    expect([...noticesFile.notices, ...JOURNEY.notices].filter(n => !ids.has(n.routeId)).map(n => n.routeId)).toEqual([]);
  });
  it('DAT-005 every route id mentioned anywhere in journey, alerts or syllabus text exists', () => {
    const ids = new Set(ROUTES.map(r => r.id));
    const text = JSON.stringify([stepsFile, noticesFile, syllabiFile, JOURNEY.steps]);
    expect([...new Set(text.match(/\bR\d{3}\b/g) ?? [])].filter(id => !ids.has(id))).toEqual([]);
  });
  it('DAT-006 route groups are the known seven, and each has an interface label', () => {
    const groups = [...new Set(ROUTES.map(r => r.route_group))].sort();
    expect(groups).toEqual(['DIPLOMA', 'JOB_EXAM', 'PRIVATE_DEGREE', 'PROFESSIONAL', 'RETRY', 'SCHOLARSHIP_ABROAD', 'VOCATIONAL']);
    for (const g of groups) expect(Object.keys(en), g).toContain(`rg.${g}`);
  });
});

// ---------------------------------------------------------------- compiled journey is in sync
describe('DAT compiled journey matches its curated sources', () => {
  it('DAT-007 compiled steps equal data/journey steps, and the academic year matches', () => {
    expect(JOURNEY.steps).toEqual(stepsFile.steps);
    expect(JOURNEY.academicYear).toBe(stepsFile.academicYear);
    expect(RB.academicYear).toBe(stepsFile.academicYear);
  });
  it('DAT-008 compiled notices equal data/alerts notices plus the route\'s own provider and source', () => {
    expect(JOURNEY.notices.length).toBe(noticesFile.notices.length);
    JOURNEY.notices.forEach((n, i) => {
      const { provider, sourceLocator, sourceUrl, officialUrl, retrievedOn, ...rest } = n;
      expect(rest, n.routeId).toEqual(noticesFile.notices[i]);
      const r = ROUTES.find(x => x.id === n.routeId)!;
      expect([provider, sourceLocator, sourceUrl, officialUrl, retrievedOn], n.routeId)
        .toEqual([r.provider, r.source_locator, r.source_url, r.official_url, r.retrieved_on]);
    });
  });
  it('DAT-009 build stamps are real timestamps', () => {
    expect(Number.isNaN(Date.parse(JOURNEY.builtAt))).toBe(false);
    expect(Number.isNaN(Date.parse(RB.generatedAt))).toBe(false);
  });
});

// ---------------------------------------------------------------- dates
describe('DAT dates', () => {
  it('DAT-010 every notice date is a real ISO date and closes on or after it opens', () => {
    for (const n of JOURNEY.notices) {
      expect(isIso(n.closesOn), `${n.routeId} closesOn`).toBe(true);
      if (n.opensOn !== null) {
        expect(isIso(n.opensOn), `${n.routeId} opensOn`).toBe(true);
        expect(n.opensOn <= n.closesOn, `${n.routeId} opens after it closes`).toBe(true);
      }
      if (n.age) expect(isIso(n.age.asOf), `${n.routeId} age.asOf`).toBe(true);
    }
  });
  it('DAT-011 every route and file retrieval date is ISO and not after the build', () => {
    // Project dates are Sri Lanka dates (UTC+05:30); builtAt is UTC, so compare on the Sri Lanka calendar day.
    const built = new Date(Date.parse(JOURNEY.builtAt) + 330 * 60_000).toISOString().slice(0, 10);
    for (const d of [routesFile.retrievedOn, noticesFile.retrievedOn, syllabiFile.retrievedOn, ...ROUTES.map(r => r.retrieved_on)]) {
      expect(isIso(d), d).toBe(true);
      expect(d <= built, d).toBe(true);
    }
  });
  it('DAT-012 every compiled route closing date is ISO and comes from that route\'s own intake text', () => {
    for (const r of RB.routes.filter(x => x.closesOn !== null)) {
      expect(isIso(r.closesOn), r.id).toBe(true);
      expect(inText(r.closesOn!, r.intakeTiming ?? ''), `${r.id} ${r.closesOn} not in its intake text`).toBe(true);
    }
  });
  it('DAT-013 "open at retrieval" is only claimed where the source text says OPEN and the date was still ahead', () => {
    for (const r of RB.routes.filter(x => x.openAtRetrieval)) {
      expect(r.intakeTiming, r.id).toMatch(/\bOPEN\b/);
      expect(r.closesOn !== null && r.closesOn >= r.retrievedOn, r.id).toBe(true);
    }
  });
  it('DAT-014 notice dates are written in the route\'s official intake text ("before X" may close the day before)', () => {
    for (const n of JOURNEY.notices) {
      const text = String(ROUTES.find(r => r.id === n.routeId)!.intake_timing);
      if (n.opensOn) expect(inText(n.opensOn, text), `${n.routeId} opensOn ${n.opensOn}`).toBe(true);
      const ok = inText(n.closesOn, text) || spellings(addDays(n.closesOn, 1)).some(s => new RegExp(`before ${s.replace(/\./g, '\\.')}`).test(text));
      expect(ok, `${n.routeId} closesOn ${n.closesOn}`).toBe(true);
    }
  });
  it('DAT-015 a notice closes on the same day as its compiled route, or the day before a "before" deadline', () => {
    for (const n of JOURNEY.notices) {
      const r = RB.routes.find(x => x.id === n.routeId)!;
      expect(r.closesOn === n.closesOn || r.closesOn === addDays(n.closesOn, 1), `${n.routeId} ${n.closesOn} vs ${r.closesOn}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------- no invented UGC dates
describe('DAT no invented UGC dates', () => {
  it('DAT-016 no UGC step carries a date (opensOn absent or null) until a UGC press notice is sourced', () => {
    for (const s of [...stepsFile.steps, ...JOURNEY.steps]) expect(s.opensOn ?? null, s.id).toBeNull();
  });
  it('DAT-017 no UGC step text states a calendar date', () => {
    for (const s of JOURNEY.steps) for (const f of [s.title, s.detail, s.when]) expect(DATE_IN_TEXT.test(f), `${s.id}: ${f}`).toBe(false);
  });
  it('DAT-018 every UGC step cites a handbook page and a non-trivial quote', () => {
    for (const s of JOURNEY.steps) {
      expect(Number.isInteger(s.page) && s.page > 0, s.id).toBe(true);
      expect(s.quote.trim().length, s.id).toBeGreaterThan(20);
    }
  });
  it('DAT-019 Journey step ids and kinds are unique', () => {
    expect(dupes(JOURNEY.steps.map(s => s.id))).toEqual([]);
    expect(dupes(JOURNEY.steps.map(s => s.kind))).toEqual([]);
  });
});

// ---------------------------------------------------------------- links
describe('DAT links: https, official, never blocked', () => {
  it('DAT-020 the blocked-host list was read from worker/syllabi.ts and is not empty', () => {
    expect(BLOCKED_HOSTS.size).toBeGreaterThan(0);
  });
  it('DAT-021 no link anywhere (fields or free text) is on a blocked host', () => {
    const hits = [...ALL_URLS, ...TEXT_URLS].filter(u => BLOCKED_HOSTS.has(host(u.url)));
    expect(hits.map(h => h.where)).toEqual([]);
  });
  it('DAT-022 no blocked host name appears anywhere in the curated or compiled data, even without a scheme', () => {
    const text = JSON.stringify([ROUTES, stepsFile, noticesFile, syllabiFile, JOURNEY, RB]).toLowerCase();
    expect([...BLOCKED_HOSTS].filter(h => text.includes(h)).length).toBe(0);
  });
  it('DAT-023 every served syllabus avoids blocked hosts (the Worker filter holds)', () => {
    for (const [code, s] of SYLLABI) expect(s.sourceUrls.some(u => BLOCKED_HOSTS.has(host(u))), code).toBe(false);
  });
  it('DAT-024 every link parses as a URL', () => {
    for (const u of [...ALL_URLS, ...TEXT_URLS]) expect(() => new URL(u.url), u.where).not.toThrow();
  });
  it('DAT-025 every link is https (pinned exceptions: KNOWN.notHttps)', () => {
    const bad = ALL_URLS.filter(u => new URL(u.url).protocol !== 'https:').map(u => u.where)
      .filter(w => !w.startsWith('notice ') && !w.startsWith('rulebook '));   // copies of the route field, reported once
    expect(bad).toEqual(KNOWN.notHttps);
    expect(TEXT_URLS.filter(u => new URL(u.url).protocol !== 'https:').map(u => u.where)).toEqual([]);
  });
  it('DAT-026 every source link is on an official domain: *.ac.lk, ugc.ac.lk, *.gov.lk or the institution\'s own (pinned: KNOWN.offAllowList)', () => {
    const bad = ALL_URLS.filter(u => !officialHost(host(u.url))).map(u => u.where);
    expect(bad).toEqual(KNOWN.offAllowList);
    expect(TEXT_URLS.filter(u => !officialHost(host(u.url))).map(u => u.where)).toEqual([]);
  });
  it('DAT-027 a route\'s source is a government/university page or the provider\'s own site, never a third party', () => {
    for (const r of ROUTES) {
      const h = host(r.source_url);
      const gov = h.endsWith('.gov.lk') || h.endsWith('.ac.lk');
      expect(gov || (r.official_url !== null && host(r.official_url) === h), `${r.id} source ${h}`).toBe(true);
    }
  });
  it('DAT-028 every syllabus link sits on a university domain (*.ac.lk or a UGC-named one), pinned exceptions aside', () => {
    const bad = syllabiFile.programmes.flatMap(p => (p.sourceUrls ?? []).map((u, i) => ({ w: `syllabus ${p.uniCode} sourceUrls[${i}]`, h: host(u) })))
      .filter(x => !(x.h.endsWith('.ac.lk') || NAMED_UNIVERSITY_DOMAINS.has(x.h) || [...NAMED_UNIVERSITY_DOMAINS].some(d => x.h.endsWith(`.${d}`))))
      .map(x => x.w);
    expect(bad).toEqual(KNOWN.offAllowList);
  });
  it('DAT-029 the UGC handbook link points at ugc.ac.lk over https', () => {
    expect(new URL(HANDBOOK_URL).protocol).toBe('https:');
    expect(host(HANDBOOK_URL).replace(/^www\./, '')).toBe('ugc.ac.lk');
  });
});

// ---------------------------------------------------------------- every number has a source
describe('DAT every number has a source', () => {
  it('DAT-030 every route carries a source link, a locator and a retrieval date', () => {
    for (const r of ROUTES) {
      expect(r.source_url, r.id).toMatch(/^https?:\/\//);
      expect(String(r.source_locator).trim().length, `${r.id} source_locator`).toBeGreaterThan(3);
      expect(isIso(r.retrieved_on), r.id).toBe(true);
    }
  });
  it('DAT-031 route costs are sane: whole LKR, not negative, min <= max', () => {
    for (const r of ROUTES) {
      for (const c of [r.cost_min_lkr, r.cost_max_lkr]) if (c !== null) expect(Number.isInteger(c) && c >= 0, r.id).toBe(true);
      if (r.cost_min_lkr !== null && r.cost_max_lkr !== null) expect(r.cost_min_lkr <= r.cost_max_lkr, r.id).toBe(true);
    }
  });
  it('DAT-032 route confidence is a number between 0 and 1', () => {
    for (const r of ROUTES) expect(typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 1, r.id).toBe(true);
  });
  it('DAT-033 every notice eligibility number comes with its verbatim quote from the route\'s official text', () => {
    const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
    for (const n of JOURNEY.notices) {
      const text = squash(ROUTES.find(r => r.id === n.routeId)!.entry_requirements_text);
      for (const q of [n.age?.quote, n.al?.quote]) if (q !== undefined) expect(text.includes(squash(q)), `${n.routeId}: ${q}`).toBe(true);
      if (n.age) {
        expect(n.age.quote.trim(), n.routeId).not.toBe('');
        expect(n.age.min === null || n.age.max === null || n.age.min <= n.age.max, n.routeId).toBe(true);
      }
      if (n.al) expect(n.al.passes >= 1 && n.al.passes <= 3 && n.al.quote.trim() !== '', n.routeId).toBe(true);
    }
  });
  it('DAT-034 every notice A/L subject code is a real subject in the rulebook', () => {
    const codes = new Set(RB.subjects.map(s => s.code));
    for (const n of JOURNEY.notices) for (const s of [...(n.al?.subjects?.all ?? []), ...(n.al?.subjects?.oneOf ?? [])]) expect(codes.has(s), `${n.routeId} ${s}`).toBe(true);
  });
  it('DAT-035 every course rule cites a handbook page and its quote', () => {
    for (const [code, c] of Object.entries(RB.courses)) {
      expect(Number.isInteger(c.page) && c.page > 0, code).toBe(true);
      expect(c.quote.trim().length, code).toBeGreaterThan(10);
    }
  });
  it('DAT-036 every cut-off year names one of the five hashed UGC sources and a page', () => {
    const titles = new Set(RB.sources.map(s => s.title));
    for (const s of RB.sources) expect(s.sha256, s.id).toMatch(/^[0-9a-f]{64}$/);
    const bad: string[] = [];   // collected, then asserted once: ~1,000 rows, so one expect per row is needlessly slow
    let rows = 0;
    for (const o of RB.offerings) for (const g of o.groups) for (const y of g.years) {
      rows++;
      if (!titles.has(y.source) || y.sourceLabel.trim() === '' || !Number.isInteger(y.page) || y.page <= 0) bad.push(`${o.uniCode} ${g.code} ${y.academicYear}`);
    }
    expect(rows).toBeGreaterThan(RB.offerings.length);
    expect(bad).toEqual([]);
  });
  it('DAT-037 every cut-off row has one value per district, each null or a plausible Z-score', () => {
    const bad: string[] = [];
    for (const o of RB.offerings) for (const g of o.groups) for (const y of g.years) {
      if (y.zE4.length !== RB.districts.length) bad.push(`${o.uniCode} ${g.code} ${y.academicYear}: ${y.zE4.length} values`);
      for (const z of y.zE4) if (z !== null && !(Number.isInteger(z) && z > -40000 && z < 40000)) bad.push(`${o.uniCode} ${y.academicYear}: ${z}`);
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------- syllabi and Uni-Codes
describe('DAT syllabi and Uni-Codes', () => {
  const csvCodes = new Set(UNICODES.map(u => u.code));
  it('DAT-038 every syllabus Uni-Code exists in data/ugc/2025-2026/unicodes.csv and in the compiled offerings', () => {
    const offered = new Set(RB.offerings.map(o => o.uniCode));
    for (const p of syllabiFile.programmes) {
      expect(csvCodes.has(p.uniCode), p.uniCode).toBe(true);
      expect(offered.has(p.uniCode), p.uniCode).toBe(true);
    }
  });
  it('DAT-039 every syllabus names the same university as the UGC Uni-Code list', () => {
    for (const p of syllabiFile.programmes)
      expect(p.university.toUpperCase(), p.uniCode).toBe(UNICODES.find(u => u.code === p.uniCode)!.university.toUpperCase());
  });
  it('DAT-040 Uni-Codes are well formed and unique (csv, offerings, syllabi), and the compiled offerings match the csv', () => {
    expect(UNICODES.filter(u => !/^\d{3}[A-Z]$/.test(u.code)).map(u => u.code)).toEqual([]);
    expect(dupes(UNICODES.map(u => u.code))).toEqual([]);
    expect(dupes(RB.offerings.map(o => o.uniCode))).toEqual([]);
    expect(dupes(syllabiFile.programmes.map(p => p.uniCode))).toEqual([]);
    expect(RB.offerings.map(o => o.uniCode).sort()).toEqual([...csvCodes].sort());
  });
  it('DAT-041 only FOUND syllabi with modules and a source link are served; withheld ones are not', () => {
    for (const p of syllabiFile.programmes) {
      const served = SYLLABI.has(p.uniCode);
      if (served) {
        expect(p.status, p.uniCode).toBe('FOUND');
        expect((p.sourceUrls ?? []).length, p.uniCode).toBeGreaterThan(0);
        expect(SYLLABI.get(p.uniCode)!.years.every(y => y.modules.length > 0), p.uniCode).toBe(true);
      } else expect(p.status === 'FOUND' && (p.years ?? []).some(y => y.modules.length > 0) && !(p.sourceUrls ?? []).some(u => BLOCKED_HOSTS.has(host(u))), p.uniCode).toBe(false);
    }
  });
  it('DAT-042 no syllabus repeats a module inside one year, or a year label', () => {
    for (const p of syllabiFile.programmes) {
      expect(dupes((p.years ?? []).map(y => y.label)), p.uniCode).toEqual([]);
      for (const y of p.years ?? []) expect(dupes(y.modules), `${p.uniCode} ${y.label}`).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------- duplicates
describe('DAT no duplicated entries', () => {
  it('DAT-043 no two routes share the same name and provider', () => {
    expect(dupes(ROUTES.map(r => `${r.name}|${r.provider}`))).toEqual([]);
  });
  it('DAT-044 no two notices share a route and kind, and none duplicates a title', () => {
    expect(dupes(JOURNEY.notices.map(n => `${n.routeId}|${n.kind}`))).toEqual([]);
    expect(dupes(JOURNEY.notices.map(n => n.title))).toEqual([]);
  });
  it('DAT-045 districts, streams and subjects are unique by code, with 25 districts', () => {
    expect(RB.districts.length).toBe(25);
    for (const list of [RB.districts, RB.streams, RB.subjects]) expect(dupes(list.map(x => x.code))).toEqual([]);
  });
});

// ---------------------------------------------------------------- sample content
describe('DAT sample content is labelled as sample', () => {
  const keys = [...new Set(['BATCH', ...RB.offerings.map(o => sampleKey('COURSE', o.courseCode)), sampleKey('COURSE', null)])];
  const all = keys.flatMap(k => samplesFor(k));
  it('DAT-046 every sample chat message is flagged sample, authored "Sample ...", and has a sample- id', () => {
    expect(keys.length).toBeGreaterThan(2);
    for (const m of all) {
      expect(m.sample, m.id).toBe(true);
      expect(m.author, m.id).toMatch(/^Sample\b/);
      expect(m.id, m.id).toMatch(/^sample-/);
    }
    expect(dupes(all.map(m => m.id))).toEqual([]);
  });
  it('DAT-047 no sample message claims to be verified or states a cut-off, Z-score or date', () => {
    for (const m of all) {
      expect(`${m.author} ${m.badge ?? ''}`, m.id).not.toMatch(/verified/i);
      expect(m.body, m.id).not.toMatch(/\b\d\.\d{2,}\b|\b20\d\d\b/);
      expect(DATE_IN_TEXT.test(m.body), m.id).toBe(false);
    }
  });
  it('DAT-048 every course with its own sample thread is a real course code', () => {
    const codes = new Set(RB.offerings.map(o => o.courseCode));
    for (const k of keys.filter(x => x.startsWith('COURSE:'))) expect(codes.has(k.slice(7)), k).toBe(true);
  });
  it('DAT-049 the demo student uses a reserved example.com address and a username marked demo', () => {
    expect(DEMO_CONTACT.email.endsWith('@example.com')).toBe(true);
    expect(DEMO_USERNAME).toMatch(/demo/i);
  });
});

// ---------------------------------------------------------------- Sinhala and Tamil
describe('DAT Sinhala and Tamil wherever English is', () => {
  const sinhala = /[඀-෿]/, tamil = /[஀-௿]/;
  it('DAT-050 every Journey step\'s English text matches the interface source, and Sinhala + Tamil exist for it', () => {
    for (const s of JOURNEY.steps) for (const f of ['title', 'detail', 'when'] as const) {
      const key = `step.${s.id}.${f}` as keyof typeof en;
      expect(en[key], key).toBe(s[f]);
      expect(sinhala.test(si[key] ?? ''), `si ${key}`).toBe(true);
      expect(tamil.test(ta[key] ?? ''), `ta ${key}`).toBe(true);
    }
  });
  it('DAT-051 every route group in the data has a Sinhala and Tamil label and subtitle', () => {
    for (const g of new Set(ROUTES.map(r => r.route_group))) for (const k of [`rg.${g}`, `rg.${g}.sub`] as (keyof typeof en)[]) {
      expect(en[k], k).toBeTruthy();
      expect((si[k] ?? '').trim(), `si ${k}`).not.toBe('');
      expect((ta[k] ?? '').trim(), `ta ${k}`).not.toBe('');
    }
  });
  it('DAT-052 every stream in the rulebook has an English, Sinhala and Tamil label', () => {
    for (const s of RB.streams) {
      const k = `stream.${s.code}` as keyof typeof en;
      expect(en[k], k).toBeTruthy();
      expect(sinhala.test(si[k] ?? ''), `si ${k}`).toBe(true);
      expect(tamil.test(ta[k] ?? ''), `ta ${k}`).toBe(true);
    }
  });
  it('DAT-053 the Sinhala and Tamil dictionaries cover every English key with non-empty text', () => {
    for (const d of [si, ta]) for (const k of Object.keys(en) as (keyof typeof en)[]) expect((d[k] ?? '').trim(), k).not.toBe('');
  });
});

describe('DAT blocked pages', () => {
  it('DAT-054 no URL anywhere in the data is a page blocked during research (fingerprints in tools/research/blocked-pages.ts)', () => {
    const files = [...fs.readdirSync(path.join(ROOT, 'data'), { recursive: true }) as string[]].filter(f => f.endsWith('.json'))
      .map(f => fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')).concat(fs.readFileSync(path.join(ROOT, 'worker', 'generated', 'rulebook-2025-2026.json'), 'utf8'));
    const urls = files.flatMap(t => t.match(/https?:\/\/[^"\s<>|)]+/g) ?? []);
    expect(urls.length).toBeGreaterThan(50);
    expect(urls.filter(u => { try { return isBlockedPage(u); } catch { return false; } })).toEqual([]);
  });
});
