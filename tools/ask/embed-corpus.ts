// Embeds data/ask/corpus.json with Workers AI (bge-m3) through the local dev server's localhost-only /api/dev/embed
// route, and writes data/ask/vectors.ndjson for `wrangler vectorize insert zedpath-ask --file data/ask/vectors.ndjson`.
// Needs `npm run dev` running with DEV_TOOLS=1 in .dev.vars. Run from the repo root:  node tools/ask/embed-corpus.ts
import fs from 'node:fs';
import path from 'node:path';
import { EMBED_DIMS, type CorpusPassage } from '../../shared/ask.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DEV = process.env.ZEDPATH_DEV_URL ?? 'http://localhost:5173';
const BATCH = 25;
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ask', 'corpus.json'), 'utf8')) as CorpusPassage[];

const lines: string[] = [];
for (let i = 0; i < corpus.length; i += BATCH) {
  const batch = corpus.slice(i, i + BATCH);
  const r = await fetch(`${DEV}/api/dev/embed`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: batch.map(p => p.text) }) });
  if (!r.ok) throw new Error(`embed failed at ${i}: ${r.status} ${await r.text()}`);
  const { vectors } = await r.json() as { vectors: number[][] };
  if (vectors.length !== batch.length || vectors.some(v => v.length !== EMBED_DIMS)) throw new Error(`bad vectors at ${i}`);
  batch.forEach((p, k) => {
    // Vectorize metadata takes strings, numbers and booleans (no nulls), so absent fields are left out.
    const metadata: Record<string, string | number> = { kind: p.kind, source: p.source, text: p.text };
    if (p.page !== null) metadata.page = p.page;
    if (p.url) metadata.url = p.url;
    lines.push(JSON.stringify({ id: p.id, values: vectors[k].map(x => Math.round(x * 1e6) / 1e6), metadata }));
  });
  process.stdout.write(`\rembedded ${Math.min(i + BATCH, corpus.length)}/${corpus.length}`);
}
const out = path.join(ROOT, 'data', 'ask', 'vectors.ndjson');
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(`\nwrote ${path.relative(ROOT, out)}: ${lines.length} vectors x ${EMBED_DIMS} dims (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
