// Generates the 12 preset profile pictures (CR-006) as static SVG files in public/avatars/a01.svg ... a12.svg.
// Style: Multiavatar by Gie Katon (multiavatar.com), Multiavatar License v1.0: free for commercial use, attribution
// "Avatars by Multiavatar.com" given in the README and under the avatar picker. Praveen 2026-10-14: "use multiavatar",
// replacing the earlier robot set. The seeds were chosen from a preview of 24 for friendly, varied, student-looking
// faces. Generated once and served as files: no outside service is called when a student views them.
// Run from the repo root:  node tools/avatars/make-avatars.ts
import fs from 'node:fs';
import path from 'node:path';
import multiavatar from '@multiavatar/multiavatar';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'public', 'avatars');
// a01..a12 keep their codes (account.avatar CHECK in migration 0010), so saved choices keep working.
const SEEDS = ['kestrel-1', 'kestrel-5', 'zedpath-03', 'kestrel-10', 'zedpath-07', 'zedpath-11',
  'kestrel-4', 'zedpath-06', 'zedpath-09', 'kestrel-3', 'kestrel-9', 'zedpath-02'];

fs.mkdirSync(OUT, { recursive: true });
SEEDS.forEach((seed, i) => {
  const code = `a${String(i + 1).padStart(2, '0')}`;
  const svg = (multiavatar as (s: string) => string)(seed);
  if (!svg.startsWith('<svg')) throw new Error(`unexpected output for ${seed}`);
  fs.writeFileSync(path.join(OUT, `${code}.svg`), svg);
});
console.log(`wrote ${SEEDS.length} avatars to ${path.relative(ROOT, OUT)}`);
