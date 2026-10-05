// Builds the Ask ZedPath source corpus: passages an answer is allowed to use, each tagged with where it came from.
//   1. UGC handbook 2025/26 (local PDF, not redistributed in the repo): one or more passages per printed page.
//   2. The 52 verified "other paths" records (data/routes/), with their official source.
// Output: data/ask/corpus.json (gitignored: it contains handbook text). Ingested into Vectorize by
// tools/ask/embed-corpus.ts. Run from the repo root:  node tools/ask/build-corpus.ts
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { CorpusPassage } from '../../shared/ask.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const HANDBOOK = path.join(ROOT, 'student_handbook_english.pdf');
const PDF_TO_PRINTED = 7;                       // printed page = PDF page - 7 (same mapping as tools/seed/load.ts)
const MAX = 1100, OVERLAP = 180;                // characters per passage; overlap keeps sentences that straddle a cut

const clean = (s: string) => s
  .replace(/|||/g, '•')                        // Symbol-font bullets
  .replace(/-\s*\d+\s*-\s*ACADEMIC YEAR 2025\/2026\s*UNIVERSITY GRANTS COMMISSION/gi, ' ')   // running header
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();

function split(text: string): string[] {
  if (text.length <= MAX) return [text];
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + MAX);
    if (end < text.length) {                                              // cut at a line or sentence end if possible
      const cut = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end));
      if (cut > start + MAX * 0.5) end = cut + 1;
    }
    out.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - OVERLAP, start + 1);
  }
  return out;
}

const passages: CorpusPassage[] = [];
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(HANDBOOK)), useSystemFonts: true, verbosity: 0 }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const printed = p - PDF_TO_PRINTED;
  if (printed < 1) continue;                                              // cover, contents, messages
  const content = await (await doc.getPage(p)).getTextContent();
  // Join text runs by position: a space only where there is a visible gap, so "Co" + "mbined" stays "Combined".
  let raw = '', prevEnd: number | null = null, prevY: number | null = null;
  for (const i of content.items) {
    if (!('str' in i)) continue;
    const [, , , , x, y] = i.transform as number[];
    const sameLine = prevY !== null && Math.abs(y - prevY) < 2;
    if (sameLine && prevEnd !== null && x - prevEnd > 1.2 && !raw.endsWith(' ') && !i.str.startsWith(' ')) raw += ' ';
    else if (!sameLine && prevY !== null && !raw.endsWith('\n')) raw += '\n';
    raw += i.str;
    if (i.hasEOL) raw += '\n';
    prevEnd = x + i.width; prevY = y;
  }
  const text = clean(raw);
  if (text.length < 40) continue;                                         // blank or image-only page
  split(text).forEach((t, n) => passages.push({ id: `hb-${printed}-${n}`, kind: 'HANDBOOK', source: 'UGC handbook 2025/26', page: printed, url: null, text: t }));
}

const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'routes', 'routes-2026-10-05.json'), 'utf8')) as {
  routes: { id: string; route_group: string; name: string; provider: string; duration: string | null; intake_timing: string | null;
    entry_requirements_text: string; cost_min_lkr: number | null; cost_max_lkr: number | null; source_url: string; source_locator: string; retrieved_on: string }[];
};
for (const r of routes.routes) {
  const cost = r.cost_min_lkr === null ? '' : `Cost: Rs ${r.cost_min_lkr.toLocaleString('en')}${r.cost_max_lkr && r.cost_max_lkr !== r.cost_min_lkr ? ` to Rs ${r.cost_max_lkr.toLocaleString('en')}` : ''}.`;
  const text = [`${r.name} (${r.route_group.replace(/_/g, ' ').toLowerCase()}), offered by ${r.provider}.`,
    r.duration ? `Duration: ${r.duration}.` : '', cost, r.intake_timing ? `When: ${r.intake_timing}` : '',
    `Entry requirements: ${r.entry_requirements_text}`].filter(Boolean).join(' ');
  passages.push({ id: `route-${r.id}`, kind: 'ROUTE', source: `${r.source_locator} (checked ${r.retrieved_on})`, page: null, url: r.source_url, text: text.slice(0, 3000) });
}

const out = path.join(ROOT, 'data', 'ask', 'corpus.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(passages, null, 1));
const hb = passages.filter(p => p.kind === 'HANDBOOK');
console.log(`wrote ${path.relative(ROOT, out)}: ${hb.length} handbook passages from ${new Set(hb.map(p => p.page)).size} pages + ${passages.length - hb.length} route passages; ${passages.reduce((a, p) => a + p.text.length, 0).toLocaleString('en')} characters`);
