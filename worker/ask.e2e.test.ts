// Ask ZedPath end-to-end checks (ASK-001..): verdict line, leaked-reasoning filter, answer layout, citations and links,
// question validation, model fallback order, daily allowance, and suggested questions for three more profiles.
// No network at all: Workers AI, Vectorize and the model gateway are stand-ins, and global fetch throws if anything
// tries to reach out. Adds only NEW cases; worker/ask.test.ts keeps its own.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { CLAUDE_MODEL, DEVICE_PER_DAY, IP_PER_DAY, MODELS, finish, safeUrl, usableReply } from './ask.ts';
import { BLOCKED_HOSTS } from './syllabi.ts';
import { HANDBOOK_URL, QUESTION_MAX, takeVerdict, type AskResponse, type CorpusPassage } from '../shared/ask.ts';
import { layoutAnswer } from '../shared/answer.ts';
import { askSuggestions } from '../src/ask-suggest.ts';
import { setLang } from '../src/i18n/index.ts';
import type { ListEntry } from '../shared/list.ts';

const P50: Omit<CorpusPassage, 'id'> = { kind: 'HANDBOOK', source: 'UGC handbook 2025/26', page: 50, url: null,
  text: '2.2.3.1 Medicine (Course Code : 001) Minimum eligibility requirements: at least C grades in two of Biology, Chemistry and Physics.' };
const P70: Omit<CorpusPassage, 'id'> = { kind: 'HANDBOOK', source: 'UGC handbook 2025/26', page: 70, url: null,
  text: '2.2.4.5 Physical Science (Course Code - 013) Minimum eligibility requirements: at least S grades in three subjects.' };

type Part = { text?: string; thought?: boolean };
let env: Env, raw: ReturnType<typeof createTestD1>['raw'];
let replies: (Part[] | number)[];          // per model call: parts of a 200 reply, or an HTTP status
let endpoints: string[];

const realFetch = globalThis.fetch;
beforeAll(() => { globalThis.fetch = (() => { throw new Error('network call attempted in a no-network test'); }) as typeof fetch; });
afterAll(() => { globalThis.fetch = realFetch; });

beforeEach(() => {
  const t = createTestD1(); raw = t.raw;
  replies = [];
  endpoints = [];
  const ai = {
    run: async () => ({ data: [new Array(1024).fill(0.01)] }),
    gateway: () => ({ run: async (req: { endpoint: string }) => {
      endpoints.push(req.endpoint);
      const r = replies.shift() ?? [{ text: 'VERDICT: NONE\nFallback answer [1].' }];
      if (typeof r === 'number') return new Response('{}', { status: r });
      return Response.json({ candidates: [{ content: { parts: r } }] });
    } }),
  };
  env = { DB: t.d1, PEPPER: 'test-pepper', GEMINI_API_KEY: 'test-key', AI: ai,
    ASK_INDEX: { query: async () => ({ matches: [{ id: 'hb-50-0', score: 0.67, metadata: P50 }, { id: 'hb-70-0', score: 0.55, metadata: P70 }] }) } } as unknown as Env;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); setLang('en'); });

const ask = (body: unknown, headers: Record<string, string> = {}) => app.request('/api/ask', { method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }, env);
const modelOf = (endpoint: string) => endpoint.split('/')[2].split(':')[0];
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
  .map(b => b.toString(16).padStart(2, '0')).join('');

describe('takeVerdict (shared/ask.ts)', () => {
  it('ASK-001 YES is read and the line removed', () => {
    expect(takeVerdict('VERDICT: YES\nYes, you can [1].')).toEqual({ verdict: 'YES', text: 'Yes, you can [1].' });
  });
  it('ASK-002 NO is read', () => {
    expect(takeVerdict('VERDICT: NO\nNo. Medicine needs Biology [1].')).toEqual({ verdict: 'NO', text: 'No. Medicine needs Biology [1].' });
  });
  it('ASK-003 DEPENDS is read (bold markdown around it too)', () => {
    expect(takeVerdict('**VERDICT: DEPENDS**\nIt depends on your district [2].')).toEqual({ verdict: 'DEPENDS', text: 'It depends on your district [2].' });
  });
  it('ASK-004 NOT_FOUND is read', () => {
    expect(takeVerdict('VERDICT: NOT_FOUND\nI could not find it.').verdict).toBe('NOT_FOUND');
  });
  it('ASK-005 NONE means no chip, but the line is still removed', () => {
    expect(takeVerdict('VERDICT: NONE\nA Z-score is ... [1].')).toEqual({ verdict: null, text: 'A Z-score is ... [1].' });
  });
  it('ASK-006 garbage verdict values give no chip and the text is kept untouched', () => {
    for (const g of ['VERDICT: PROBABLY\nHmm', 'VERDICT: YESSS\nok', 'VERDICT:\nok']) {
      const r = takeVerdict(g);
      expect(r.verdict).toBeNull();
      expect(r.text).toBe(g.trim());
    }
  });
  it('ASK-007 lowercase and odd spacing are accepted', () => {
    expect(takeVerdict('verdict : no\nNo [1].')).toEqual({ verdict: 'NO', text: 'No [1].' });
    expect(takeVerdict('  Verdict:not_found\r\nNothing.')).toEqual({ verdict: 'NOT_FOUND', text: 'Nothing.' });
  });
  it('ASK-008 a missing line, or a verdict that is not on the first line, gives no chip', () => {
    expect(takeVerdict('Yes, you can apply [1].')).toEqual({ verdict: null, text: 'Yes, you can apply [1].' });
    expect(takeVerdict('Hello\nVERDICT: YES').verdict).toBeNull();
    expect(takeVerdict('')).toEqual({ verdict: null, text: '' });
  });
});

describe('usableReply (worker/ask.ts): leaked reasoning is never shown', () => {
  it('ASK-009 rejects "wait, rule 5"', () => {
    expect(usableReply('VERDICT: NO\nNo.\n- But wait, rule 5 says I must reply in English.')).toBe(false);
  });
  it('ASK-010 rejects VERDICT after line 1', () => {
    expect(usableReply('VERDICT: YES\nYes.\n- Actually VERDICT: NO is better.')).toBe(false);
    expect(usableReply('Yes, you can.\nVERDICT: YES')).toBe(false);
  });
  it('ASK-011 rejects "the very first line"', () => {
    expect(usableReply('VERDICT: NONE\nThe very first line must be the verdict, so...')).toBe(false);
  });
  it('ASK-012 rejects "system instruction"', () => {
    expect(usableReply('VERDICT: NONE\nPer the system instruction I should cite sources [1].')).toBe(false);
  });
  it('ASK-013 rejects "my instructions"', () => {
    expect(usableReply('VERDICT: NO\nMy instructions say not to guess.')).toBe(false);
  });
  it('ASK-014 accepts a normal English answer with bullets and citations', () => {
    expect(usableReply('VERDICT: YES\nYes, you meet the rules [1].\n- At least a **C** in Biology [1].\n- Apply by **31 March** [2].')).toBe(true);
  });
  it('ASK-015 accepts Sinhala and Tamil answers', () => {
    expect(usableReply('VERDICT: YES\nඔව්, ඔබට අයදුම් කළ හැකිය [1].\n- ජීව විද්‍යාව සඳහා අවම වශයෙන් C [1].')).toBe(true);
    expect(usableReply('VERDICT: NONE\nவட்டியில்லா மாணவர் கடன் ஒரு அரச திட்டம் [1].\n- விண்ணப்பம் இணையத்தில் [2].')).toBe(true);
  });
  it('ASK-016 known strictness (pinned): a genuine "rule 3" mention is also rejected, a "Section 3" is not', () => {
    expect(usableReply('VERDICT: NONE\nUnder rule 3 of the handbook, you may apply [1].')).toBe(false);
    expect(usableReply('VERDICT: NONE\nUnder Section 3 of the handbook, you may apply [1].')).toBe(true);
  });
});

describe('layoutAnswer (shared/answer.ts)', () => {
  it('ASK-017 a bulleted reply keeps its lead line and strips bullet markers (-, *, •, 1.)', () => {
    const l = layoutAnswer('Yes, you can apply [1].\n- First fact [1].\n* Second fact [2].\n• Third fact [2].\n1. Fourth fact [3].');
    expect(l).toEqual({ lead: 'Yes, you can apply [1].', bullets: ['First fact [1].', 'Second fact [2].', 'Third fact [2].', 'Fourth fact [3].'], rest: [] });
  });
  it('ASK-018 a reply that starts with a bullet has no lead; trailing plain lines go to rest', () => {
    const l = layoutAnswer('- Only bullets [1].\n- Another [2].\nCheck ugc.ac.lk for updates.');
    expect(l.lead).toBe('');
    expect(l.bullets).toEqual(['Only bullets [1].', 'Another [2].']);
    expect(l.rest).toEqual(['Check ugc.ac.lk for updates.']);
  });
  it('ASK-019 a wall of text becomes a lead plus one bullet per sentence, citations staying with their sentence', () => {
    const l = layoutAnswer('You can apply. It needs a C in Biology [1]. The fee is Rs. 500 [2, 3]. Apply online [4].');
    expect(l.lead).toBe('You can apply.');
    expect(l.bullets).toEqual(['It needs a C in Biology [1].', 'The fee is Rs. 500 [2, 3].', 'Apply online [4].']);
  });
  it('ASK-020 two short sentences stay as one lead (no bullets)', () => {
    expect(layoutAnswer('Yes. You can apply [1].')).toEqual({ lead: 'Yes. You can apply [1].', bullets: [], rest: [] });
  });
  it('ASK-021 show-more split: more than 4 bullets are all returned, so the screen folds the rest (SHOW = 4 in Ask.tsx)', () => {
    const l = layoutAnswer(['Lead [1].', ...[1, 2, 3, 4, 5, 6].map(n => `- Fact ${n} [${n}].`)].join('\n'));
    expect(l.bullets).toHaveLength(6);
    expect(l.bullets.slice(0, 4)).toEqual(['Fact 1 [1].', 'Fact 2 [2].', 'Fact 3 [3].', 'Fact 4 [4].']);
    expect(l.bullets.slice(4)).toEqual(['Fact 5 [5].', 'Fact 6 [6].']);
  });
  it('ASK-022 Windows line breaks and blank lines are handled; a CRLF bullet list is still bullets', () => {
    const l = layoutAnswer('Lead line [1].\r\n\r\n- A [1].\r\n- B [2].\r\n');
    expect(l).toEqual({ lead: 'Lead line [1].', bullets: ['A [1].', 'B [2].'], rest: [] });
  });
});

describe('citations and source links', () => {
  const ps: CorpusPassage[] = [{ id: 'hb-50-0', ...P50 }, { id: 'hb-70-0', ...P70 }];
  it('ASK-023 grouped and repeated citations map once each, in order of first use', () => {
    expect(finish('A [2]. B [1, 2]. C [2][1].', ps).citations.map(c => c.n)).toEqual([2, 1]);
  });
  it('ASK-024 [0] and numbers beyond the passages are dropped', () => {
    expect(finish('See [0] and [3] and [1].', ps).citations.map(c => c.n)).toEqual([1]);
  });
  it('ASK-025 a handbook citation points at the official UGC handbook and its page, quote at most 280 chars', () => {
    const long: CorpusPassage = { ...ps[0], text: 'x '.repeat(400) };
    const [c] = finish('A [1].', [long]).citations;
    expect(c).toMatchObject({ source: 'UGC handbook 2025/26', page: 50, url: HANDBOOK_URL, routeId: null });
    expect(c.quote.length).toBeLessThanOrEqual(280);
  });
  it('ASK-026 an unknown route shows "Official source" and a javascript: link is turned into no link', () => {
    const bad: CorpusPassage = { id: 'route-NOPE', kind: 'ROUTE', source: 'notes', page: null, url: 'javascript:alert(1)', text: 'x' };
    expect(finish('A [1].', [bad]).citations[0]).toMatchObject({ source: 'Official source', url: null, routeId: null });
  });
  it('ASK-027 safeUrl: https only (http, javascript:, data:, ftp:, garbage refused); whitespace trimmed', () => {
    expect(safeUrl('  https://www.ugc.ac.lk/a.pdf  ')).toBe('https://www.ugc.ac.lk/a.pdf');
    for (const u of ['http://www.ugc.ac.lk/', 'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<b>x</b>', 'ftp://ugc.ac.lk/x', 'not a url', '', undefined])
      expect(safeUrl(u)).toBeNull();
  });
  it('ASK-028 safeUrl does NOT enforce official domains (pinned current behaviour; domain trust comes from the verified route data)', () => {
    expect(safeUrl('https://example.com/x')).toBe('https://example.com/x');
  });
  it('ASK-047 safeUrl never links a host that returned unsafe content, even from an older index entry (23 Oct 2026)', () => {
    expect(BLOCKED_HOSTS.size).toBeGreaterThanOrEqual(4);
    for (const h of BLOCKED_HOSTS) {
      expect(safeUrl(`https://${h}/any/page.pdf`)).toBeNull();
      expect(safeUrl(`https://${h.toUpperCase()}/`)).toBeNull();
      const old: CorpusPassage = { id: 'route-NOPE', kind: 'ROUTE', source: 'notes', page: null, url: `https://${h}/x`, text: 'x' };
      expect(finish('A [1].', [old]).citations[0].url).toBeNull();
    }
  });
  it('ASK-029 provider names in the answer are replaced by Ask ZedPath', () => {
    expect(finish('I am GEMINI, developed by Google. Yes [1].', ps).answer).toBe('I am Ask ZedPath, part of ZedPath. Yes [1].');
  });
});

describe('question validation (POST /api/ask)', () => {
  it('ASK-030 empty and whitespace-only questions are refused', async () => {
    expect((await ask({ question: '' })).status).toBe(400);
    expect((await ask({ question: '   \n\t ' })).status).toBe(400);
    expect((await ask({ question: 'a' })).status).toBe(400);                      // under 2 characters
    expect(endpoints).toHaveLength(0);
  });
  it(`ASK-031 exactly QUESTION_MAX (${QUESTION_MAX}) characters is accepted, one more is refused`, async () => {
    expect((await ask({ question: 'M'.repeat(QUESTION_MAX) })).status).toBe(200);
    const r = await ask({ question: 'M'.repeat(QUESTION_MAX + 1) });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toContain(String(QUESTION_MAX));
  });
  it('ASK-032 surrounding spaces are trimmed before the length check', async () => {
    expect((await ask({ question: `   ${'M'.repeat(QUESTION_MAX)}   ` })).status).toBe(200);
  });
  it('ASK-033 a missing, non-string question or a body that is not JSON is refused', async () => {
    expect((await ask({})).status).toBe(400);
    expect((await ask({ question: 42 })).status).toBe(400);
    expect((await ask({ question: ['Medicine?'] })).status).toBe(400);
    expect((await ask('not json{')).status).toBe(400);
    expect(endpoints).toHaveLength(0);
  });
});

describe('model fallback order (mocked gateway, no network)', () => {
  it('ASK-034 an unusable first reply hands over to the next model in MODELS order', async () => {
    replies = [[{ text: 'VERDICT: NO\nNo.\n- wait, rule 5 says...' }], [{ text: 'VERDICT: YES\nYes. Medicine needs Biology [1].' }]];
    const b = await (await ask({ question: 'Can I do Medicine?' })).json() as AskResponse;
    expect(endpoints.map(modelOf)).toEqual(MODELS.slice(0, 2));
    expect([b.verdict, b.answer]).toEqual(['YES', 'Yes. Medicine needs Biology [1].']);
  });
  it('ASK-035 thought parts are dropped and the remaining parts joined', async () => {
    replies = [[{ text: 'Thinking: the very first line...', thought: true }, { text: 'VERDICT: NONE\nA loan ' }, { text: 'for degrees [1].' }]];
    const b = await (await ask({ question: 'What is the student loan?' })).json() as AskResponse;
    expect(endpoints).toHaveLength(1);
    expect(b.answer).toBe('A loan for degrees [1].');
    expect(b.verdict).toBeNull();
  });
  it('ASK-036 a reply of only thought parts counts as empty and the next model is asked', async () => {
    replies = [[{ text: 'secret reasoning', thought: true }], [{ text: 'VERDICT: NONE\nReal answer [1].' }]];
    const b = await (await ask({ question: 'What is a Z-score?' })).json() as AskResponse;
    expect(endpoints).toHaveLength(2);
    expect(b.answer).toBe('Real answer [1].');
  });
  it('ASK-037 every model unusable: 503 and no leaked text', async () => {
    replies = MODELS.map(() => [{ text: 'VERDICT: NO\nMy instructions say...' }]);
    const r = await ask({ question: 'Can I do Medicine?' });
    expect(r.status).toBe(503);
    expect(await r.text()).not.toMatch(/instructions/i);
    expect(endpoints.map(modelOf)).toEqual(MODELS);
  });
  it('ASK-038 404 (model missing) is skipped; a 400 request error stops at once without trying others', async () => {
    replies = [404, [{ text: 'VERDICT: NONE\nOk [1].' }]];
    expect((await ask({ question: 'Medicine?' })).status).toBe(200);
    expect(endpoints.map(modelOf)).toEqual(MODELS.slice(0, 2));
    endpoints = []; replies = [400];
    expect((await ask({ question: 'Medicine?' })).status).toBe(503);
    expect(endpoints).toHaveLength(1);
  });
  it('ASK-039 the API key goes only in the gateway header, never into the answer', async () => {
    replies = [[{ text: 'VERDICT: NONE\nAnswer [1].' }]];
    const body = await (await ask({ question: 'Medicine?' })).text();
    expect(body).not.toContain('test-key');
  });
});

describe('Claude Haiku 5.5 first, Gemini as fallback (mocked gateway, no network)', () => {
  type Sent = { provider: string; endpoint: string; headers: Record<string, string>; query: Record<string, unknown> };
  let sent: Sent[];
  let claude: (number | string)[];          // per Claude call: reply text, or an HTTP status
  beforeEach(() => {
    sent = []; claude = [];
    env = { ...env, ANTHROPIC_API_KEY: 'test-anthropic-key' } as Env;
    env.AI.gateway = (() => ({ run: async (req: Sent) => {
      sent.push(req);
      if (req.provider === 'anthropic') {
        const r = claude.shift() ?? 'VERDICT: NONE\nClaude answer [1].';
        if (typeof r === 'number') return new Response('{}', { status: r });
        return Response.json({ content: [{ type: 'text', text: r }] });
      }
      return Response.json({ candidates: [{ content: { parts: [{ text: 'VERDICT: NONE\nBackup answer [1].' }] } }] });
    } })) as never;
  });
  it('ASK-048 with an Anthropic key, Haiku 5.5 answers first through the gateway and Gemini is not called', async () => {
    const b = await (await ask({ question: 'What is the student loan?' })).json() as AskResponse;
    expect(b.answer).toBe('Ask ZedPath answer [1].');                     // "Claude" is never shown to students
    expect(sent.map(s => s.provider)).toEqual(['anthropic']);
    expect(sent[0]).toMatchObject({ endpoint: 'v1/messages', query: { model: CLAUDE_MODEL } });
    expect(sent[0].query).not.toHaveProperty('temperature');           // Haiku 5.5 rejects temperature (400)
    expect(sent[0].headers['x-api-key']).toBe('test-anthropic-key');
  });
  it('ASK-049 a Claude error or unusable reply hands over to Gemini', async () => {
    claude = [529];
    expect(((await (await ask({ question: 'Medicine?' })).json()) as AskResponse).answer).toBe('Backup answer [1].');
    expect(sent.map(s => s.provider)).toEqual(['anthropic', 'google-ai-studio']);
    sent = []; claude = ['VERDICT: NO\nMy instructions say...'];
    expect(((await (await ask({ question: 'Medicine?' })).json()) as AskResponse).answer).toBe('Backup answer [1].');
    expect(sent.map(s => s.provider)).toEqual(['anthropic', 'google-ai-studio']);
  });
  it('ASK-050 Ask works with only the Anthropic key; neither key leaks into the answer', async () => {
    env = { ...env, GEMINI_API_KEY: undefined } as Env;
    const r = await ask({ question: 'Medicine?' });
    expect(r.status).toBe(200);
    expect(await r.text()).not.toMatch(/test-anthropic-key|test-key/);
    claude = [500];
    expect((await ask({ question: 'Medicine?' })).status).toBe(503);   // no Gemini key: nothing to fall back to
  });
  it('ASK-052 a malformed verdict line from Haiku ("VERDICT: NON", seen live) is never shown: Gemini answers', async () => {
    claude = ['VERDICT: NON'];
    expect(((await (await ask({ question: 'Law degree cost?' })).json()) as AskResponse).answer).toBe('Backup answer [1].');
    expect(sent.map(s => s.provider)).toEqual(['anthropic', 'google-ai-studio']);
  });
  it('ASK-051 finish() hides Claude/Anthropic like Gemini/Google', () => {
    const p = [{ id: 'a', ...P50 }];
    expect(finish('I am Claude, made by Anthropic. Yes [1].', p).answer).toBe('I am Ask ZedPath, part of ZedPath. Yes [1].');
  });
});

describe('daily allowance (test D1)', () => {
  const DEV = '11111111-2222-4333-8444-555555555555';
  it('ASK-040 each question adds one DEVICE row and one IP row, stored only as hashes', async () => {
    await ask({ question: 'Medicine?' }, { 'X-ZedPath-Device': DEV, 'CF-Connecting-IP': '203.0.113.9' });
    await ask({ question: 'Medicine?' }, { 'X-ZedPath-Device': DEV, 'CF-Connecting-IP': '203.0.113.9' });
    const rows = raw.prepare('SELECT scope, client, used FROM ask_quota ORDER BY scope').all() as { scope: string; client: string; used: number }[];
    expect(rows.map(r => [r.scope, r.used])).toEqual([['DEVICE', 2], ['IP', 2]]);
    expect(JSON.stringify(rows)).not.toMatch(/203\.0\.113|11111111/);
  });
  it(`ASK-041 a shared network (IP) is refused after ${IP_PER_DAY} questions even from a fresh device`, async () => {
    const day = new Date().toISOString().slice(0, 10);
    raw.prepare('INSERT INTO ask_quota (day, scope, client, used) VALUES (?, ?, ?, ?)')
      .run(day, 'IP', await sha(`test-pepper|${day}|IP|198.51.100.7`), IP_PER_DAY);
    expect((await ask({ question: 'Medicine?' }, { 'X-ZedPath-Device': DEV, 'CF-Connecting-IP': '198.51.100.7' })).status).toBe(429);
    expect((await ask({ question: 'Medicine?' }, { 'X-ZedPath-Device': DEV, 'CF-Connecting-IP': '198.51.100.8' })).status).toBe(200);
  });
  it(`ASK-042 a malformed device id falls back to the IP, so it cannot dodge the ${DEVICE_PER_DAY}/day device limit`, async () => {
    const day = new Date().toISOString().slice(0, 10);
    raw.prepare('INSERT INTO ask_quota (day, scope, client, used) VALUES (?, ?, ?, ?)')
      .run(day, 'DEVICE', await sha(`test-pepper|${day}|DEVICE|ip:198.51.100.20`), DEVICE_PER_DAY);
    expect((await ask({ question: 'Medicine?' }, { 'X-ZedPath-Device': 'not-a-uuid', 'CF-Connecting-IP': '198.51.100.20' })).status).toBe(429);
    expect(endpoints).toHaveLength(0);                                      // refused before any model call
  });
  it('ASK-043 the first question of the day tidies rows older than two days', async () => {
    raw.prepare('INSERT INTO ask_quota (day, scope, client, used) VALUES (?, ?, ?, ?)').run('2000-01-01', 'IP', 'a'.repeat(64), 5);
    await ask({ question: 'Medicine?' }, { 'X-ZedPath-Device': DEV });
    expect(raw.prepare("SELECT COUNT(*) AS n FROM ask_quota WHERE day = '2000-01-01'").get()).toEqual({ n: 0 });
  });
});

describe('suggested questions (src/ask-suggest.ts), three more profiles', () => {
  const list: ListEntry[] = [
    { uniCode: '001A', group: 'ALL', course: 'Medicine', institution: 'Peradeniya', band: 'LIKELY' },
    { uniCode: '002B', group: 'ALL', course: 'Dental Surgery', institution: 'Peradeniya', band: 'SAFE' }];
  it('ASK-044 international sport, no REACH course: aims at the first list entry; one interest has no "and"', () => {
    setLang('en');
    const s = askSuggestions({ achievements: [{ id: 'x', activity: 'Asian Youth Athletics', kind: 'SPORT', level: 'INTERNATIONAL', place: 'THIRD', year: 2025 }], interests: ['Biology'] }, list);
    expect(s).toHaveLength(5);
    expect(s[1]).toBe('I came 3rd at international level in the Asian Youth Athletics in 2025. Can that help me get into Medicine at Peradeniya?');
    expect(s[2]).toBe('I love biology. Which degrees fit me best with my results?');
  });
  it('ASK-045 the best achievement wins (level, then place, then year); three interests read "a, b and c"', () => {
    setLang('en');
    const s = askSuggestions({ achievements: [
      { id: '1', activity: 'School Quiz', kind: 'COMPETITION', level: 'SCHOOL', place: 'FIRST', year: 2025 },
      { id: '2', activity: 'Provincial Debate', kind: 'OTHER', level: 'PROVINCIAL', place: 'SECOND', year: 2023 },
      { id: '3', activity: 'Provincial Chess', kind: 'OTHER', level: 'PROVINCIAL', place: 'FIRST', year: 2022 }], interests: ['Art', 'Music', 'Drama'] }, []);
    expect(s[1]).toBe('I came 1st at provincial level in the Provincial Chess in 2022. Can that help me get into university?');
    expect(s[2]).toBe('I love art, music and drama. Which degrees fit me best with my results?');
  });
  it('ASK-046 Tamil profile with interests only: five questions in Tamil, every placeholder filled, never more than 5', () => {
    setLang('ta');
    const s = askSuggestions({ achievements: [], interests: ['Maths', 'Physics'] }, list);
    expect(s).toHaveLength(5);
    expect(s.join(' ')).not.toMatch(/\{\w+\}/);
    expect(s.join(' ')).toMatch(/[஀-௿]/);
  });
});
