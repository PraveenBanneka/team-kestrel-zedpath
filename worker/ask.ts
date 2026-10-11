// Ask ZedPath (POST /api/ask): cited answers from the UGC handbook and the verified routes, plus facts from ZedPath's
// own rule engine for the student's results. Flow: embed the question (Workers AI, bge-m3, multilingual) -> nearest
// passages (Vectorize) -> engine facts (same assessOffering as /results) -> language model through AI Gateway,
// instructed to use ONLY those passages and facts and to cite them. The assistant is always "Ask ZedPath"; the model
// provider is never named to students. The student's results are used for the answer and not stored.
import { Hono, type Context } from 'hono';
import type { ApiError, ProfileInput } from '../shared/api.ts';
import { formatZ } from '../shared/banding.ts';
import { EMBED_MODEL, HANDBOOK_URL, QUESTION_MAX, takeVerdict, type AskAction, type AskCitation, type AskFeedback, type AskResponse, type CorpusPassage } from '../shared/ask.ts';
import journey from './generated/journey-2025-2026.json' with { type: 'json' };
import { assessOffering, book, districtIndex, parseProfile } from './rulebook.ts';
import { parseExtras } from './account.ts';
import { specialIntakeHint, type Extras } from '../shared/account.ts';

type AppEnv = { Bindings: Env };
type C = Context<AppEnv>;

const GATEWAY_ID = 'zedpath';
/** Tried in order. A model that is missing (404), busy (5xx, e.g. "high demand") or out of free quota (429: quotas are
 *  per model on the free tier) hands over to the next. `-latest` follows Google's newest model of that size. */
export const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
const TOP_K = 6;
export const MIN_SCORE = 0.50;  // calibrated 2026-10-05 (tools/ask/calibrate.ts): weakest right page 0.551 (Sinhala), strongest off-topic 0.474
export const DEVICE_PER_DAY = 30, IP_PER_DAY = 300;
const SINHALA = /[඀-෿]/, TAMIL = /[஀-௿]/;

const SYSTEM = `You are Ask ZedPath, a friendly guide for Sri Lankan students choosing what to do after their A-Level (A/L) results.
Rules you must always follow:
1. Use ONLY the numbered sources and the ZedPath engine facts in the message. Do not use outside knowledge, even if you think you know.
2. Cite every factual claim with the source number in square brackets, like [2]. Engine facts need no citation.
3. If the sources and facts do not answer the question, say plainly that you could not find it in the UGC handbook or ZedPath's official sources, and suggest checking ugc.ac.lk or the institution. Never guess.
4. Never promise admission. Chances come only from the engine facts: Safe, Likely or Reach describe past cut-offs, not a guarantee.
5. Reply in the same language as the question (English, Sinhala or Tamil); if that is unclear, use the app language given. Plain words, no jargon. Layout, always:
   the very first line is exactly "VERDICT: YES", "VERDICT: NO", "VERDICT: DEPENDS" or "VERDICT: NOT_FOUND" (in English, whatever the reply language);
   NOT_FOUND when the sources and facts do not answer it, DEPENDS when the answer differs by case;
   first ONE short sentence that answers the question directly (for example "Yes." plus the key point);
   then 2 to 4 bullet lines starting with "- ", one fact per bullet, each ending with its citation like [2];
   **bold** only course names, dates and key numbers. No headings, no paragraphs after the bullets, under 90 words.
6. You are Ask ZedPath. Never say which company or AI model you are.`;

const sha256Hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
  .map(b => b.toString(16).padStart(2, '0')).join('');
const err = (c: C, status: 400 | 403 | 404 | 429 | 503, error: string) => c.json({ error } satisfies ApiError, status);
const norm = (s: string) => ` ${s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const ip = (c: C) => c.req.header('CF-Connecting-IP') ?? 'local';
/** "UNIVERSITY OF SRI JAYEWARDENEPURA" -> "University of Sri Jayewardenepura" (the source tables are in capitals). */
export const tidyName = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase())
  .replace(/\b(Of|And|In|The|For)\b/g, w => w.toLowerCase()).replace(/\b(Ucsc|Ict|It|Sp)\b/g, w => w.toUpperCase()).replace(/^./, m => m.toUpperCase());

export const askRoutes = new Hono<AppEnv>();

/** Counts this question against the daily allowance; true when over. Rows hold only daily-salted hashes. */
async function overQuota(c: C): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const device = c.req.header('X-ZedPath-Device') ?? '';
  const deviceKey = /^[0-9a-f-]{36}$/i.test(device) ? device.toLowerCase() : `ip:${ip(c)}`;
  const up = `INSERT INTO ask_quota (day, scope, client, used) VALUES (?, ?, ?, 1)
    ON CONFLICT (day, scope, client) DO UPDATE SET used = used + 1 RETURNING used`;
  const db = c.env.DB;
  const [d, i] = await db.batch([
    db.prepare(up).bind(day, 'DEVICE', await sha256Hex(`${c.env.PEPPER}|${day}|DEVICE|${deviceKey}`)),
    db.prepare(up).bind(day, 'IP', await sha256Hex(`${c.env.PEPPER}|${day}|IP|${ip(c)}`)),
  ]);
  const used = (r: D1Result) => (r.results as { used: number }[])[0]?.used ?? 0;
  if (used(d) === 1) {                                                   // first question of the day: tidy old days
    const cutoff = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    await db.prepare('DELETE FROM ask_quota WHERE day < ?').bind(cutoff).run();
  }
  return used(d) > DEVICE_PER_DAY || used(i) > IP_PER_DAY;
}

/** Courses the question is about: named in the question, or whose course code appears in the retrieved passages. */
export function coursesFor(question: string, passages: CorpusPassage[]): string[] {
  const q = norm(question);
  const named = Object.entries(book.courses).filter(([, c]) => q.includes(norm(c.name))).map(([code]) => code)
    .sort((a, b) => book.courses[b].name.length - book.courses[a].name.length);   // "Computer Science" before "Science"
  const cited = passages.flatMap(p => [...p.text.matchAll(/Course Code\s*[-–:]\s*(\d{3})/gi)].map(m => m[1]))
    .filter(code => book.courses[code]);
  return [...new Set([...named, ...cited])].slice(0, 4);
}

/** Plain-language facts about those courses for THIS student, from the same engine as the results screen. */
export function engineFacts(codes: string[], p: ProfileInput | null): string[] {
  if (!p) return [];
  const district = tidyName(book.districts[districtIndex.get(p.district)!]?.name ?? p.district);
  const label = { SAFE: 'Safe', LIKELY: 'Likely', REACH: 'Reach', OUT_OF_RANGE: 'Out of range', NOT_ENOUGH_DATA: 'Not enough data' } as const;
  return codes.map(code => {
    const course = book.courses[code];
    const offerings = book.offerings.filter(o => o.courseCode === code);
    const assessed = offerings.map(o => ({ o, a: assessOffering(o, p) }));
    const eligible = assessed.filter(x => x.a.anyEligible);
    const name = `${course.name.charAt(0)}${course.name.slice(1).toLowerCase()} (course ${code})`;
    if (eligible.length === 0) return `${name}: the student's subjects and grades do NOT meet the entry rules (UGC handbook p.${course.page}).`;
    const needsOl = eligible.some(x => x.a.groups.some(g => g.verdict === 'NEEDS_OL'));
    const places = eligible.flatMap(({ o, a }) => a.groups.filter(g => g.result).map(g => {
      const r = g.result!;
      const cut = r.latestE4 === null ? 'no recent cut-off' : `latest cut-off ${formatZ(r.latestE4)}`;
      return `${tidyName(o.institution.replace(/,?\s*Sri Lanka$/i, ''))}${o.groups.length > 1 ? ` (${g.group.code})` : ''}: ${label[r.band]} (${cut})`;
    })).slice(0, 12);                                                     // every place: the widest course has 12 (offering x group)
    return `${name}: the student's subjects meet the A/L entry rules${needsOl ? ', but O/L results must also be checked' : ''}. ` +
      `Chances for ${district} district with Z-score ${formatZ(p.zE4)}: ${places.join('; ')}.`;
  });
}

async function generate(env: Env, userText: string): Promise<{ text: string } | { status: number }> {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  };
  const gw = env.AI.gateway(GATEWAY_ID);
  let last = 404;
  for (const model of MODELS) {
    const r = await gw.run({ provider: 'google-ai-studio', endpoint: `v1beta/models/${model}:generateContent`,
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY!, 'content-type': 'application/json' }, query: body });
    if (r.ok) {
      const j = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (j.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('').trim();
      if (text) return { text };
      last = 503;                                                       // empty reply: treat as busy, try the next
      continue;
    }
    console.error(`ask: model ${model} -> ${r.status} ${(await r.text()).slice(0, 300)}`);   // no key in this text
    last = r.status;
    if (r.status !== 404 && r.status !== 429 && r.status < 500) return { status: r.status };   // a real request error: stop
  }
  return { status: last };
}

/** Keeps the assistant's identity and the citations honest. */
export function finish(raw: string, passages: CorpusPassage[]): { answer: string; citations: AskCitation[] } {
  const answer = raw.replace(/\bGemini\b/gi, 'Ask ZedPath').replace(/\b(trained|developed|made) by Google\b/gi, 'part of ZedPath');
  const cited: number[] = [];
  for (const m of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g))
    for (const n of m[1].split(',').map(Number)) if (n >= 1 && n <= passages.length && !cited.includes(n)) cited.push(n);
  const toCitation = (n: number): AskCitation => {
    const p = passages[n - 1];
    const quote = p.text.replace(/\s+/g, ' ').slice(0, 280).trim();
    if (p.kind === 'HANDBOOK') return { n, source: 'UGC handbook 2025/26', page: p.page, url: HANDBOOK_URL, routeId: null, quote };
    // Routes: the index stores the researcher's source notes; students see the route's name and its official document.
    const routeId = p.id.replace(/^route-/, ''), r = book.routes.find(x => x.id === routeId);
    return { n, source: r ? r.name : 'Official source', page: null, url: safeUrl(r?.sourceUrl ?? p.url), routeId: r ? r.id : null, quote };
  };
  return { answer, citations: cited.map(toCitation) };
}

/** An https link with spaces and brackets escaped (some Gazette file names have them), or null. */
export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try { const url = new URL(u.trim()); return url.protocol === 'https:' ? encodeURI(decodeURI(url.href)) : null; } catch { return null; }
}

/** Video 2 (Praveen 2026-10-11): achievements and interests ("beyond grades") make answers personal. Plain facts for
 *  the model; the special-intake check is ZedPath's own rule (shared/account.ts), never the model's guess. */
export function extrasFacts(e: Extras | null): string[] {
  if (!e || (e.achievements.length === 0 && e.interests.length === 0)) return [];
  const lvl = { SCHOOL: 'school', ZONAL: 'zonal', DISTRICT: 'district', PROVINCIAL: 'provincial', NATIONAL: 'national', INTERNATIONAL: 'international' } as Record<string, string>;
  const place = { FIRST: '1st place', SECOND: '2nd place', THIRD: '3rd place', TAKING_PART: 'took part' } as Record<string, string>;
  const out: string[] = [];
  if (e.achievements.length) out.push(`The student's achievements (entered by the student): ${e.achievements.map(a =>
    `${a.activity} (${a.kind.toLowerCase()}, ${lvl[a.level] ?? a.level.toLowerCase()} level, ${place[a.place] ?? a.place.toLowerCase()}, ${a.year})`).join('; ')}.`);
  if (e.interests.length) out.push(`The student's interests: ${e.interests.map(i => i.toLowerCase().replace(/_/g, ' ')).join(', ')}.`);
  const hint = specialIntakeHint(e);
  out.push(hint.applies
    ? `ZedPath's check: these achievements MAY qualify for the special intake for outstanding achievements (UGC handbook 2025/26 Section 6, p.166-167), ` +
      `which applies to candidates within a Z-score of 0.2000 of their district cut-off${hint.sport ? '; sport also has extra places in Sports Science and Physical Education' : ''}. It is not a guarantee.`
    : 'ZedPath\'s check: none of these achievements is at the level the special intake needs (1st to 3rd at national level, or international, in 2023 to 2025).');
  return out;
}
const SPECIAL_INTAKE_Q = 'special intake outstanding achievements sports national international level';

const NOT_FOUND = 'I could not find this in the UGC handbook or the official sources ZedPath checks. Please look at ugc.ac.lk or ask the institution directly.';

askRoutes.post('/ask', async c => {
  if (!c.env.AI || !c.env.ASK_INDEX || !c.env.GEMINI_API_KEY || !c.env.DB || !c.env.PEPPER) return err(c, 503, 'Ask ZedPath is not available yet');
  const origin = c.req.header('Origin');
  if (origin && new URL(origin).host !== new URL(c.req.url).host) return err(c, 403, 'Cross-site request refused');
  const b = await c.req.json().catch(() => null) as { question?: unknown; profile?: unknown; lang?: unknown; extras?: unknown } | null;
  const question = typeof b?.question === 'string' ? b.question.trim() : '';
  if (question.length < 2 || question.length > QUESTION_MAX) return err(c, 400, `Ask a question of up to ${QUESTION_MAX} characters`);
  let profile: ProfileInput | null = null;
  if (b?.profile != null) {
    const p = parseProfile(b.profile);
    if ('error' in p) return err(c, 400, p.error);
    profile = p;
  }
  let extras: Extras | null = null;                                     // used for this answer only; never stored
  if (b?.extras != null) {
    const e = parseExtras(b.extras);
    if ('error' in e) return err(c, 400, e.error);
    extras = e;
  }
  if (c.env.AUTH_LIMITER && !(await c.env.AUTH_LIMITER.limit({ key: `ask:${ip(c)}:${c.req.header('X-ZedPath-Device') ?? ''}` })).success)
    return err(c, 429, 'Too many questions at once. Wait a minute and try again');
  if (await overQuota(c)) return err(c, 429, `That is today's limit of ${DEVICE_PER_DAY} questions. Ask again tomorrow`);

  // 1. Find the passages closest in meaning (works across English, Sinhala and Tamil).
  //    With qualifying achievements, the special-intake section is looked up too, so the answer can cite it.
  const special = extras ? specialIntakeHint(extras).applies : false;
  const emb = await c.env.AI.run(EMBED_MODEL as Parameters<Ai['run']>[0], { text: special ? [question, SPECIAL_INTAKE_Q] : [question] } as never) as { data?: number[][] };
  const vector = emb.data?.[0];
  if (!vector) return err(c, 503, 'Ask ZedPath is busy. Try again in a minute');
  const found = await c.env.ASK_INDEX.query(vector, { topK: TOP_K, returnMetadata: 'all' });
  const extra = special && emb.data?.[1] ? (await c.env.ASK_INDEX.query(emb.data[1], { topK: 2, returnMetadata: 'all' })).matches : [];
  const passages = [...found.matches, ...extra.filter(m => !found.matches.some(f => f.id === m.id))].filter(m => m.score >= MIN_SCORE && m.metadata)
    .map(m => ({ id: m.id, ...(m.metadata as unknown as Omit<CorpusPassage, 'id'>) }));

  // 2. Facts about the courses involved, for this student, from ZedPath's own engine; and the next steps (CR-004).
  const codes = coursesFor(question, passages);
  const facts = [...engineFacts(codes, profile), ...extrasFacts(extras)];
  const actions = askActions(question, codes, profile);

  const localScript = SINHALA.test(question) || TAMIL.test(question);
  if (passages.length === 0 && facts.length === 0 && !localScript) {
    return c.json({ answer: NOT_FOUND, citations: [], engineFacts: [], verdict: 'NOT_FOUND', actions: [], answeredAt: new Date().toISOString() } satisfies AskResponse);
  }

  // 3. The language model writes the answer from those passages and facts only.
  const sources = passages.map((p, i) => `[${i + 1}] ${p.kind === 'HANDBOOK' ? `UGC handbook 2025/26, page ${p.page}` : p.source}\n${p.text}`).join('\n\n');
  const lang = ({ si: 'Sinhala', ta: 'Tamil' } as Record<string, string>)[String(b?.lang)] ?? 'English';
  const userText = `App language: ${lang}\nStudent's question: ${question}\n\nZedPath engine facts (computed from this student's own results; trust them over general statements):\n` +
    `${facts.length ? facts.map(f => `- ${f}`).join('\n') : '- none (the student has not entered results, or no course is involved)'}\n\n` +
    `Sources:\n${sources || '(no relevant sources found)'}`;
  const out = await generate(c.env, userText);
  if ('status' in out) return err(c, out.status === 429 ? 429 : 503, out.status === 429
    ? 'Ask ZedPath is very busy right now. Try again in a minute' : 'Ask ZedPath is busy. Try again in a minute');
  const { verdict, text } = takeVerdict(out.text || '');
  const { answer, citations } = finish(text || NOT_FOUND, passages);
  return c.json({ answer, citations, engineFacts: facts, verdict: text ? verdict : 'NOT_FOUND', actions, answeredAt: new Date().toISOString() } satisfies AskResponse);
});

/**
 * CR-004 actions: the courses the question is about (best chance first, at most 3 places) and Gazette/intake notices
 * whose distinctive title words appear in the question. Built from ZedPath's own data, never from the model's text.
 */
const NOTICE_STOP = new Set(['examination', 'competitive', 'service', 'services', 'officers', 'officer', 'grade', 'national', 'diploma',
  'technology', 'apprenticeship', 'university', 'department', 'recruitment', 'technician', 'special', 'moratuwa']);
export function askActions(question: string, codes: string[], p: ProfileInput | null): AskAction[] {
  const rank = { SAFE: 0, LIKELY: 1, REACH: 2, NOT_ENOUGH_DATA: 3, OUT_OF_RANGE: 4 } as const;
  const places = codes.flatMap(code => book.offerings.filter(o => o.courseCode === code).map(o => {
    const a = p ? assessOffering(o, p) : null;
    const bands = a?.groups.map(g => g.result?.band).filter(Boolean) as (keyof typeof rank)[] | undefined;
    const band = !p ? null : !a?.anyEligible ? null : bands?.length ? bands.sort((x, y) => rank[x] - rank[y])[0] : 'NOT_ENOUGH_DATA';
    return { kind: 'COURSE' as const, uniCode: o.uniCode, course: tidyName(o.course), institution: tidyName(o.institution.replace(/,?\s*Sri Lanka$/i, '')), band };
  })).sort((x, y) => (x.band === null ? 9 : rank[x.band]) - (y.band === null ? 9 : rank[y.band])).slice(0, 3);
  const q = norm(question);
  const notices = journey.notices.filter(n => norm(n.title).split(' ').filter(w => w.length >= 6 && !NOTICE_STOP.has(w)).some(w => q.includes(` ${w.slice(0, 6)}`)))
    .slice(0, 2).map(n => ({ kind: 'NOTICE' as const, routeId: n.routeId, title: n.title, closesOn: n.closesOn }));
  return [...places, ...notices];
}

/** CR-004: "Helpful" / "Report a wrong answer". Stores the question, the answer and its pages; nothing that identifies
 *  the student. Rate-limited per IP; same-origin only. */
askRoutes.post('/ask/feedback', async c => {
  if (!c.env.DB) return err(c, 503, 'Feedback is not available yet');
  const origin = c.req.header('Origin');
  if (origin && new URL(origin).host !== new URL(c.req.url).host) return err(c, 403, 'Cross-site request refused');
  if (c.env.IP_LIMITER && !(await c.env.IP_LIMITER.limit({ key: `fb:${ip(c)}` })).success) return err(c, 429, 'Too many reports. Wait a minute');
  const b = await c.req.json().catch(() => null) as Partial<AskFeedback> | null;
  const question = String(b?.question ?? '').trim(), answer = String(b?.answer ?? '').trim(), note = b?.note ? String(b.note).trim().slice(0, 500) : null;
  const pages = Array.isArray(b?.pages) ? b!.pages.filter(n => Number.isInteger(n) && n > 0 && n < 1000).slice(0, 20) : [];
  if (question.length < 2 || question.length > QUESTION_MAX || !answer || answer.length > 4000) return err(c, 400, 'Nothing to report');
  if (b?.rating !== 'HELPFUL' && b?.rating !== 'WRONG') return err(c, 400, 'Choose helpful or wrong');
  const lang = b?.lang === 'si' || b?.lang === 'ta' ? b.lang : 'en';
  await c.env.DB.prepare(`INSERT INTO answer_feedback (rating, question, answer, pages, note, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(b.rating, question, answer, JSON.stringify(pages), note || null, lang, new Date().toISOString()).run();
  return c.body(null, 204);
});

// Local developer tool: embeds corpus passages for tools/ask/embed-corpus.ts. Off unless DEV_TOOLS=1 (set only in
// .dev.vars) AND the request is to localhost, so it can never run in production.
askRoutes.post('/dev/embed', async c => {
  const host = new URL(c.req.url).hostname;
  if (c.env.DEV_TOOLS !== '1' || !['localhost', '127.0.0.1'].includes(host)) return err(c, 404, 'Not found');
  const b = await c.req.json() as { texts: string[] };
  const r = await c.env.AI.run(EMBED_MODEL as Parameters<Ai['run']>[0], { text: b.texts } as never) as { data: number[][] };
  return c.json({ vectors: r.data });
});

// Local developer tool: what retrieval returns for a question (id, score, page), to calibrate MIN_SCORE on evidence.
askRoutes.post('/dev/search', async c => {
  const host = new URL(c.req.url).hostname;
  if (c.env.DEV_TOOLS !== '1' || !['localhost', '127.0.0.1'].includes(host)) return err(c, 404, 'Not found');
  const { q, k } = await c.req.json() as { q: string; k?: number };
  const emb = await c.env.AI.run(EMBED_MODEL as Parameters<Ai['run']>[0], { text: [q] } as never) as { data: number[][] };
  const res = await c.env.ASK_INDEX.query(emb.data[0], { topK: k ?? 8, returnMetadata: 'all' });
  return c.json(res.matches.map(m => ({ id: m.id, score: Math.round(m.score * 1000) / 1000, page: (m.metadata as { page?: number })?.page ?? null,
    head: String((m.metadata as { text?: string })?.text ?? '').replace(/\s+/g, ' ').slice(0, 70) })));
});
