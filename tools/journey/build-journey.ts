// Compiles the Journey + Alerts read model (CR-002) into worker/generated/journey-2025-2026.json, the same pattern as
// the rulebook: curated, cited source files in data/ -> one checked JSON bundled into the Worker (no database reads).
// Checks, and refuses to write on any failure:
//   - every notice points at a route in data/routes, and its quotes appear verbatim in that route's official text;
//   - every date is a real YYYY-MM-DD, opening before closing, eligibility numbers sane;
//   - every Journey step's quote appears verbatim on its handbook page (when the handbook text, data/ask/corpus.json,
//     is present on this machine; it is not in the public repo). Run from the repo root:
//   node tools/journey/build-journey.ts
import fs from 'node:fs';
import path from 'node:path';
import type { JourneyResponse, JourneyStep, Notice } from '../../shared/journey.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const stepsFile = read('data/journey/ugc-steps-2025-2026.json') as { academicYear: string; steps: JourneyStep[] };
const noticesFile = read('data/alerts/notices-2026-10-23.json') as { retrievedOn: string; notices: Omit<Notice, 'provider' | 'sourceLocator' | 'sourceUrl' | 'officialUrl' | 'retrievedOn'>[] };
const routes = (read('data/routes/routes-2026-10-23.json') as { routes: Record<string, string | null>[] }).routes;
const CORPUS = path.join(ROOT, 'data', 'ask', 'corpus.json');

const problems: string[] = [];
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s).toISOString().slice(0, 10) === s;
const SUBJECTS = new Set((read('worker/generated/rulebook-2025-2026.json') as { subjects: { code: string }[] }).subjects.map(s => s.code));

const notices: Notice[] = noticesFile.notices.map(n => {
  const r = routes.find(x => x.id === n.routeId);
  if (!r) { problems.push(`${n.routeId}: no such route`); return null as unknown as Notice; }
  const text = squash(String(r.entry_requirements_text));
  for (const q of [n.age?.quote, n.al?.quote].filter(Boolean) as string[]) if (!text.includes(squash(q))) problems.push(`${n.routeId}: quote not in the official text: "${q}"`);
  if (!isDate(n.closesOn) || (n.opensOn !== null && (!isDate(n.opensOn) || n.opensOn > n.closesOn))) problems.push(`${n.routeId}: bad dates`);
  if (n.age && (!isDate(n.age.asOf) || (n.age.min !== null && n.age.max !== null && n.age.min > n.age.max))) problems.push(`${n.routeId}: bad age rule`);
  if (n.al && (n.al.passes < 1 || n.al.passes > 3 || [...(n.al.subjects?.all ?? []), ...(n.al.subjects?.oneOf ?? [])].some(s => !SUBJECTS.has(s)))) problems.push(`${n.routeId}: bad A/L rule`);
  return { ...n, provider: String(r.provider), sourceLocator: String(r.source_locator), sourceUrl: String(r.source_url),
    officialUrl: r.official_url ?? null, retrievedOn: String(r.retrieved_on) };
});

let checkedSteps = 'skipped (handbook text not on this machine)';
if (fs.existsSync(CORPUS)) {
  const passages = JSON.parse(fs.readFileSync(CORPUS, 'utf8')) as { kind?: string; page: number | null; text: string; id: string }[];
  for (const s of stepsFile.steps) {
    const page = squash(passages.filter(p => p.id.startsWith('hb-') && p.page === s.page).map(p => p.text).join(' '));
    // passages overlap at their edges, so a quote may span two of them: compare against the page as one text
    if (!page.includes(squash(s.quote).slice(0, 60)) || !page.replace(/ /g, '').includes(squash(s.quote).replace(/ /g, '')))
      problems.push(`step ${s.id}: quote not found on handbook page ${s.page}`);
  }
  checkedSteps = `${stepsFile.steps.length} quotes found verbatim on their handbook pages`;
}

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const out: JourneyResponse & { builtAt: string } = { academicYear: stepsFile.academicYear, handbook: 'UGC handbook 2025/26',
  steps: stepsFile.steps, notices, builtAt: new Date().toISOString() };
const file = path.join(ROOT, 'worker', 'generated', 'journey-2025-2026.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`journey: ${out.steps.length} steps (${checkedSteps}), ${notices.length} notices checked against their routes -> ${path.relative(ROOT, file)}`);
