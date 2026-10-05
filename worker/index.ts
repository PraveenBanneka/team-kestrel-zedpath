// ZedPath API Worker (Hono). Only /api/* reaches this Worker; all pages are free static assets (NFR-012).
// Student requests are answered from the bundled rulebook: no database reads, a few milliseconds of CPU (NFR-005).
import { Hono } from 'hono';
import type { Meta, OfferingDetail, ResultsResponse, OfferingSummary, HiddenOffering, ApiError, RouteSummary } from '../shared/api.ts';
import type { Band } from '../shared/banding.ts';
import { describe } from '../shared/describe.ts';
import { assessOffering, book, districtIndex, parseProfile, SUBJECT_NAMES } from './rulebook.ts';
import { accountRoutes } from './account.ts';
import { askRoutes } from './ask.ts';

/** Short names for selection groups (seat splits by stream or category). */
function groupName(code: string, label: string | null): string {
  const known: Record<string, string> = { BIO: 'Biological Science stream', OTHER: 'Other streams',
    BIO_PHYS: 'Biological or Physical Science stream', COMMERCE: 'Commerce stream' };
  if (known[code]) return known[code];
  const bracket = label?.match(/\[([^\]]+)\]/)?.[1];
  return bracket ? `Group ${code}: ${bracket}` : `Group ${code}`;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// Cached answers must change the moment the data or the API changes: the ETag is the rulebook build, and clients
// revalidate every time (304 when unchanged), so a deploy can never leave a phone holding an old response shape.
const ETAG = `"rb-${book.generatedAt}"`;
const cacheable = (c: { req: { header: (n: string) => string | undefined }; header: (n: string, v: string) => void }) => {
  c.header('Cache-Control', 'public, no-cache');
  c.header('ETag', ETAG);
  return c.req.header('If-None-Match') === ETAG;
};

app.get('/health', c => c.json({ ok: true, academicYear: book.academicYear, rules: book.rulesStatus, generatedAt: book.generatedAt }));

app.get('/meta', c => {
  const meta: Meta = { academicYear: book.academicYear, districts: book.districts, streams: book.streams,
    subjects: book.subjects.map(s => ({ ...s, streams: [] })), sources: book.sources };
  if (cacheable(c)) return c.body(null, 304);
  return c.json(meta);
});

app.post('/results', async c => {
  if (book.rulesStatus !== 'RECONCILED') return c.json({ error: 'Course rules are being verified; try again shortly' } satisfies ApiError, 503);
  const parsed = parseProfile(await c.req.json().catch(() => null));
  if ('error' in parsed) return c.json(parsed, 400);
  const p = parsed;
  const offerings: OfferingSummary[] = [];
  const hidden: HiddenOffering[] = [];
  const counts: Record<Band, number> = { SAFE: 0, LIKELY: 0, REACH: 0, OUT_OF_RANGE: 0, NOT_ENOUGH_DATA: 0 };

  for (const o of book.offerings) {
    const a = assessOffering(o, p);
    for (const { group: g, verdict, result: r } of a.groups) {
      if (!r) continue;
      counts[r.band]++;
      offerings.push({ uniCode: o.uniCode, courseCode: o.courseCode, course: o.course, institution: o.institution,
        group: g.code, groupLabel: g.label, band: r.band, limitedHistory: r.limitedHistory, yearsUsed: r.yearsUsed,
        latestE4: r.latestE4, gapToLatestE4: r.gapToLatestE4, trend: r.trend, hasAptitudeTest: o.hasAptitudeTest,
        meritOnly: o.meritOnly, needsOl: verdict === 'NEEDS_OL' });
    }
    if (!a.anyEligible) { const course = book.courses[o.courseCode];
      hidden.push({ uniCode: o.uniCode, course: o.course, institution: o.institution, reason: course.quote, page: course.page }); }
  }
  const res: ResultsResponse = { academicYear: book.academicYear, counts, offerings, hidden, computedAt: new Date().toISOString() };
  return c.json(res);
});

app.get('/offerings/:uniCode', c => {
  const o = book.offerings.find(x => x.uniCode === c.req.param('uniCode').toUpperCase());
  if (!o) return c.json({ error: 'No such Uni-Code' } satisfies ApiError, 404);
  const district = c.req.query('district');
  const di = district ? districtIndex.get(district) : undefined;
  const course = book.courses[o.courseCode];
  const detail: OfferingDetail = {
    uniCode: o.uniCode, course: o.course, institution: o.institution, proposedIntake: o.proposedIntake, duration: o.duration,
    selectionBasis: o.meritOnly ? 'MERIT_ONLY' : 'QUOTA', hasAptitudeTest: o.hasAptitudeTest,
    requirementText: course?.quote ?? '',
    // split courses: one set of lines per selection group, labelled, instead of one long "One of" sentence
    needs: !course ? [] : course.groups
      ? o.groups.flatMap(g => [`${groupName(g.code, g.label)}:`, ...describe(course.groups![g.code]?.al ?? course.al, SUBJECT_NAMES).map(l => `  ${l}`)])
      : describe(course.al, SUBJECT_NAMES),
    olNeeds: course?.ol ? describe(course.ol, SUBJECT_NAMES) : [],
    ambiguousWording: course?.reconciliation?.reading === 'INCLUSIVE',
    requirementCitation: { sourceId: '1', page: course?.page ?? o.page, label: 'UGC handbook 2025/26' },
    otherRequirements: o.other,
    groups: o.groups.map(g => ({ code: g.code, label: g.label, history: g.years.map(y => ({
      academicYear: y.academicYear, zE4: di === undefined ? null : y.zE4[di],
      citation: { sourceId: y.source, page: y.page, label: y.sourceLabel } })) })),
  };
  if (cacheable(c)) return c.body(null, 304);
  return c.json(detail);
});

/** Other routes (FE-5). "Open now" = open when checked AND the latest date in the official timing is not past. */
app.get('/routes', c => {
  const today = new Date().toISOString().slice(0, 10);
  const out: RouteSummary[] = book.routes.map(({ closesOn, openAtRetrieval, ...r }) => ({ ...r, openNow: openAtRetrieval && !!closesOn && closesOn >= today }));
  c.header('Cache-Control', 'public, max-age=300');
  return c.json(out);
});

// Student accounts (CR-001): /api/auth/* and /api/me.
app.route('/', accountRoutes);
// Ask ZedPath: /api/ask (cited answers) and the localhost-only /api/dev/embed tool.
app.route('/', askRoutes);

app.notFound(c => c.json({ error: 'Not found' } satisfies ApiError, 404));

export default app;
