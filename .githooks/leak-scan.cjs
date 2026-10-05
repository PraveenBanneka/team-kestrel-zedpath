#!/usr/bin/env node
// Pre-push leak scanner. This repo is PUBLIC, so every pushed commit is scanned for secrets,
// secret files and the salon account id (matched by SHA-256 fingerprint only).
// Usage: called by .githooks/pre-push with git's stdin (<local ref> <local sha> <remote ref> <remote sha>),
// or run by hand: `node .githooks/leak-scan.cjs --all` to scan the whole history.

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const ZERO = /^0+$/;
const SALON_ACCOUNT_SHA256 = 'e817fa57f36e284be3d8310a2969b96c534e05c6737b6348d69a7268cfda514a';

const SECRET_PATTERNS = [
  ['Google/Gemini API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Anthropic API key', /sk-ant-[0-9A-Za-z_-]{20,}/],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9]{32,}\b/],
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['Cloudflare token assignment', /CLOUDFLARE_API_(TOKEN|KEY)\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}/],
];
const FORBIDDEN_FILES = /(^|\/)(\.dev\.vars(\..*)?|\.env(\.(?!example$).*)?|.*\.pem|id_rsa.*|.*\.(jks|keystore|p12|pfx|dpapi))$/;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

function ranges() {
  if (process.argv.includes('--all')) return ['HEAD'];
  const input = fs.readFileSync(0, 'utf8').trim();
  if (!input) return [];
  return input.split('\n').map(l => l.trim().split(/\s+/)).filter(p => p.length === 4 && !ZERO.test(p[1]))
    .map(([, local, , remote]) => (ZERO.test(remote) ? local : `${remote}..${local}`));
}

const problems = [];
for (const range of ranges()) {
  for (const f of git('log', '--format=', '--name-only', '--diff-filter=AM', range).split('\n').filter(Boolean)) {
    if (FORBIDDEN_FILES.test(f)) problems.push(`secret file committed: ${f}`);
  }
  let file = '';
  for (const line of git('log', '-p', '--format=commit %h', '--no-color', range).split('\n')) {
    if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const [name, re] of SECRET_PATTERNS) if (re.test(line)) problems.push(`${name} in ${file}`);
    for (const hex of line.match(/\b[0-9a-f]{32}\b/gi) || []) {
      if (crypto.createHash('sha256').update(hex.toLowerCase()).digest('hex') === SALON_ACCOUNT_SHA256) {
        problems.push(`salon Cloudflare account id in ${file}`);
      }
    }
  }
}

if (problems.length) {
  console.error('\nLEAK SCAN FAILED: push blocked. This repo is public.\n' +
    [...new Set(problems)].map(p => '  - ' + p).join('\n') +
    '\nRemove the secret from the commits (not just the latest file), rotate it if it was real, then push again.\n');
  process.exit(1);
}
console.error('leak scan: clean');
