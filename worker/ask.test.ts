// Ask ZedPath (POST /api/ask) with stand-ins for Workers AI, Vectorize and the language model (no network).
// Covers: safe default, validation, citations, the "not found" path, engine facts from the real rule engine,
// what the model is sent, the assistant's name, the daily allowance, upstream errors and privacy of the quota table.
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { DEVICE_PER_DAY, MIN_SCORE, coursesFor, engineFacts, finish, tidyName } from './ask.ts';
import type { AskResponse, CorpusPassage } from '../shared/ask.ts';

const P50: Omit<CorpusPassage, 'id'> = { kind: 'HANDBOOK', source: 'UGC handbook 2025/26', page: 50, url: null,
  text: '2.2.3.1 Medicine (Course Code : 001) Minimum eligibility requirements: at least C grades in two of Biology, Chemistry and Physics and S in the third.' };
const P70: Omit<CorpusPassage, 'id'> = { kind: 'HANDBOOK', source: 'UGC handbook 2025/26', page: 70, url: null,
  text: '2.2.4.5 Physical Science (Course Code - 013) Minimum eligibility requirements: at least S grades in three subjects incl. Combined Mathematics.' };
const STUDENT = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } };

let env: Env, raw: ReturnType<typeof createTestD1>['raw'];
let matches: { id: string; score: number; metadata: Record<string, unknown> }[];
let modelReply: { status: number; text?: string };
let sentToModel: { endpoint: string; body: { contents: { parts: { text: string }[] }[]; systemInstruction: { parts: { text: string }[] } } }[];

beforeEach(() => {
  const t = createTestD1(); raw = t.raw;
  matches = [{ id: 'hb-50-0', score: 0.67, metadata: P50 }, { id: 'hb-70-0', score: 0.55, metadata: P70 }];
  modelReply = { status: 200, text: 'Medicine needs Biology, Chemistry and Physics [1].' };
  sentToModel = [];
  const ai = {
    run: async () => ({ data: [new Array(1024).fill(0.01)] }),
    gateway: () => ({ run: async (req: { endpoint: string; query: never }) => {
      sentToModel.push({ endpoint: req.endpoint, body: req.query });
      if (modelReply.status !== 200) return new Response('{}', { status: modelReply.status });
      return Response.json({ candidates: [{ content: { parts: [{ text: modelReply.text }] } }] });
    } }),
  };
  env = { DB: t.d1, PEPPER: 'test-pepper', GEMINI_API_KEY: 'test-key', AI: ai,
    ASK_INDEX: { query: async () => ({ matches }) } } as unknown as Env;
});

const ask = (body: unknown, headers: Record<string, string> = {}) => app.request('/api/ask', { method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }, env);

describe('Ask ZedPath', () => {
  it('is switched off (503) until every piece exists, and nothing else breaks', async () => {
    env = { ...env, GEMINI_API_KEY: undefined } as Env;
    expect((await ask({ question: 'What is needed for Medicine?' })).status).toBe(503);
  });

  it('validates the question and the profile on the server', async () => {
    expect((await ask({ question: ' ' })).status).toBe(400);
    expect((await ask({ question: 'x'.repeat(501) })).status).toBe(400);
    expect((await ask({ question: 'Medicine?', profile: { stream: 'MAGIC' } })).status).toBe(400);
    expect((await ask({ question: 'Medicine?' }, { Origin: 'https://evil.example' })).status).toBe(403);
  });

  it('answers with citations that point at the exact passages used', async () => {
    const r = await ask({ question: 'What are the entry requirements for Medicine?' });
    expect(r.status).toBe(200);
    const b = await r.json() as AskResponse;
    expect(b.answer).toContain('[1]');
    expect(b.citations).toEqual([{ n: 1, source: 'UGC handbook 2025/26', page: 50, url: null, quote: expect.stringContaining('Medicine') }]);
  });

  it('sends the model only the relevant passages, the rules, and never the provider name to the student', async () => {
    matches.push({ id: 'hb-9-0', score: MIN_SCORE - 0.01, metadata: { ...P50, page: 9, text: 'Unrelated page about fees.' } });
    modelReply.text = 'I am Gemini, trained by Google. Medicine needs three science subjects [1][2].';
    const b = await (await ask({ question: 'Medicine requirements?' })).json() as AskResponse;
    const sent = sentToModel[0];
    expect(sent.endpoint).toMatch(/^v1beta\/models\/[a-z0-9.-]+:generateContent$/);
    expect(sent.body.systemInstruction.parts[0].text).toContain('Use ONLY the numbered sources');
    expect(sent.body.contents[0].parts[0].text).toContain('page 50');
    expect(sent.body.contents[0].parts[0].text).not.toContain('Unrelated page about fees');   // below the threshold
    expect(b.answer).not.toMatch(/gemini|google/i);
    expect(b.citations.map(c => c.page)).toEqual([50, 70]);
  });

  it('says "not found" for off-topic English questions without spending a model call', async () => {
    matches = [{ id: 'hb-1-0', score: 0.43, metadata: P50 }];
    const b = await (await ask({ question: 'What is the best cricket bat to buy?' })).json() as AskResponse;
    expect(b.answer).toMatch(/could not find/i);
    expect(sentToModel).toHaveLength(0);
  });

  it('still asks the model for Sinhala or Tamil questions, so the reply is in that language', async () => {
    matches = [];
    await ask({ question: 'වෛද්‍ය විද්‍යාව ගැන කියන්න' });
    expect(sentToModel).toHaveLength(1);
  });

  it('adds facts from ZedPath\'s own rule engine for the student\'s results', async () => {
    // Same verdicts as the results screen for this student: Computer Science (012) eligible; Physical Science (013)
    // not, because ICT is not an allowed third subject for 013 (handbook p.70); Medicine (001) not.
    const b = await (await ask({ question: 'Can I do Computer Science?', profile: STUDENT })).json() as AskResponse;
    const cs = b.engineFacts.find(f => f.includes('course 012'))!;
    expect(cs).toMatch(/Computer science \(course 012\): the student's subjects meet the A\/L entry rules/);
    expect(cs).toMatch(/(Safe|Likely|Reach)/);
    expect(b.engineFacts.find(f => f.includes('course 013'))).toMatch(/do NOT meet the entry rules \(UGC handbook p\.70\)/);
    expect(sentToModel[0].body.contents[0].parts[0].text).toContain('ZedPath engine facts');
    const med = await (await ask({ question: 'Can I do Medicine?', profile: STUDENT })).json() as AskResponse;
    expect(med.engineFacts.find(f => f.includes('course 001'))).toMatch(/do NOT meet the entry rules/);
  });

  it('finds courses by name in the question and by course code in the passages', () => {
    expect(coursesFor('Can I do computer science?', [])).toContain('012');
    expect(coursesFor('what about this?', [{ id: 'x', ...P50 }])).toEqual(['001']);
    expect(engineFacts(['001'], null)).toEqual([]);                       // no results entered: no personal facts
  });

  it('turns the source tables\' capitals into readable names in engine facts', () => {
    expect(tidyName('UNIVERSITY OF SRI JAYEWARDENEPURA')).toBe('University of Sri Jayewardenepura');
    expect(tidyName('UNIVERSITY OF COLOMBO SCHOOL OF COMPUTING (UCSC)')).toBe('University of Colombo School of Computing (UCSC)');
    expect(engineFacts(['012'], STUDENT as never)[0]).not.toMatch(/UNIVERSITY|KURUNEGALA/);
  });

  it('keeps only citations that exist', () => {
    const { citations } = finish('See [1], [3] and [9].', [{ id: 'a', ...P50 }, { id: 'b', ...P70 }, { id: 'c', ...P70 }]);
    expect(citations.map(c => c.n)).toEqual([1, 3]);
  });

  it('allows 30 questions a day per device, while other devices on the same network carry on', async () => {
    const dev = (n: number) => ({ 'X-ZedPath-Device': `00000000-0000-4000-8000-${String(n).padStart(12, '0')}` });
    for (let i = 0; i < DEVICE_PER_DAY; i++) expect((await ask({ question: 'Medicine?' }, dev(1))).status).toBe(200);
    expect((await ask({ question: 'Medicine?' }, dev(1))).status).toBe(429);
    expect((await ask({ question: 'Medicine?' }, dev(2))).status).toBe(200);
    const rows = raw.prepare('SELECT client FROM ask_quota').all() as { client: string }[];
    expect(rows.every(r => /^[0-9a-f]{64}$/.test(r.client))).toBe(true);           // only hashes, no device ids
    expect(JSON.stringify(rows)).not.toContain('00000000-0000-4000');
  });

  it('moves on to the next model when one is busy or out of quota, and says so kindly only if all are', async () => {
    let calls = 0;
    env.AI.gateway = (() => ({ run: async (req: { endpoint: string }) => {
      calls++;
      sentToModel.push({ endpoint: req.endpoint, body: {} as never });
      if (calls === 1) return new Response('{"error":{"status":"UNAVAILABLE"}}', { status: 503 });   // "high demand"
      if (calls === 2) return new Response('{}', { status: 429 });                                  // free quota used up
      return Response.json({ candidates: [{ content: { parts: [{ text: 'Answer [1].' }] } }] });
    } })) as never;
    const ok = await ask({ question: 'Medicine?' });
    expect(ok.status).toBe(200);
    expect(sentToModel.map(s => s.endpoint.split('/')[2].split(':')[0])).toEqual(['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest']);
    calls = -100;                                                        // every model busy
    env.AI.gateway = (() => ({ run: async () => new Response('{}', { status: 503 }) })) as never;
    expect((await ask({ question: 'Medicine?' })).status).toBe(503);
    env.AI.gateway = (() => ({ run: async () => new Response('{}', { status: 429 }) })) as never;
    expect((await ask({ question: 'Medicine?' })).status).toBe(429);
  });

  it('keeps the developer tools off unless DEV_TOOLS=1 and the request is to localhost', async () => {
    const r = await app.request('https://zedpath.example/api/dev/embed', { method: 'POST', body: '{"texts":["x"]}' }, { ...env, DEV_TOOLS: '1' } as Env);
    expect(r.status).toBe(404);
    expect((await app.request('/api/dev/search', { method: 'POST', body: '{"q":"x"}' }, env)).status).toBe(404);
  });
});
