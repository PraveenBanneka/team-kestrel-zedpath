// Research safety check (CLAUDE.md rule 1): is this URL on a blocked host or a blocked page? Run before fetching.
// Usage: node tools/research/check-url.ts <url> [<url> ...]   -> prints BLOCKED or ok per URL; exit 1 if any is blocked.
import fs from 'node:fs';
import path from 'node:path';
import { isBlockedPage } from './blocked-pages.ts';

const src = fs.readFileSync(path.resolve(import.meta.dirname, '..', '..', 'worker', 'syllabi.ts'), 'utf8');
const hosts = new Set([...(src.match(/BLOCKED_HOSTS\s*=\s*new Set\(\[([^\]]*)\]\)/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1].toLowerCase()));
let blocked = false;
for (const url of process.argv.slice(2)) {
  const bad = hosts.has(new URL(url).hostname.toLowerCase()) || isBlockedPage(url);
  blocked ||= bad;
  console.log(`${bad ? 'BLOCKED' : 'ok'}\t${url}`);
}
process.exit(blocked ? 1 : 0);
