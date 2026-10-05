#!/usr/bin/env node
// ZedPath guard — PreToolUse hook. Hard-blocks (exit 2) anything that could reach the wrong
// Cloudflare account or production without Praveen's explicit GO.
//
//   1. Account switching (wrangler login/logout, cf auth ...)  -> ALWAYS blocked. Praveen does it by hand.
//   2. Anything touching the salon folder                      -> ALWAYS blocked. Not part of this project.
//   3. The salon account id appearing anywhere in a command    -> ALWAYS blocked.
//   4. Outward-facing Cloudflare actions (deploy, secrets, --remote data, Cloudflare MCP writes)
//      -> blocked UNLESS (a) the project's wrangler config pins account_id to a non-salon account
//         AND (b) Praveen's most recent chat message starts with "GO".
//   5. GitHub: only PraveenBanneka/zedpath may be pushed to or created; other repos are never
//      created, edited, deleted or made public. Force-push needs GO.
//
// Reads the hook payload from stdin. Exit 0 = allow, exit 2 = block (stderr is shown to Claude).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The salon account id is stored only as a SHA-256 fingerprint, so this public repo never contains it.
// Tests may add extra fake ids via ZEDPATH_GUARD_EXTRA_BLOCKED_ID (it can only ADD blocks, never remove).
const SALON_ACCOUNT_SHA256 = 'e817fa57f36e284be3d8310a2969b96c534e05c6737b6348d69a7268cfda514a';
const sha256 = s => crypto.createHash('sha256').update(s.toLowerCase()).digest('hex');
const isSalonId = id => sha256(id) === SALON_ACCOUNT_SHA256 ||
  (!!process.env.ZEDPATH_GUARD_EXTRA_BLOCKED_ID && id.toLowerCase() === process.env.ZEDPATH_GUARD_EXTRA_BLOCKED_ID.toLowerCase());
const SALON_DIR_PATTERN = /new website june 20/i;
const OUR_REPO = /github\.com[/:]PraveenBanneka\/zedpath(\.git)?\b/i;

const ACCOUNT_SWITCH = [
  /\bwrangler(\.cmd)?\s+(login|logout)\b/i,
  /\bcf\s+auth\b/i,
];

const OUTWARD = [
  /\bwrangler(\.cmd)?\s+(deploy|publish|rollback|delete)\b/i,
  /\bwrangler(\.cmd)?\s+versions\s+(deploy|upload)\b/i,
  /\bwrangler(\.cmd)?\s+pages\s+(deploy|publish|project\s+(create|delete))\b/i,
  /\bwrangler(\.cmd)?\s+(secret|secret:bulk)\b/i,
  /\bwrangler(\.cmd)?\s+(d1|kv|r2|vectorize|queues)\s+\S+\s+(create|delete)\b/i,
  /\bwrangler(\.cmd)?\b.*--remote\b/i,
  /\bwrangler(\.cmd)?\s+d1\s+migrations\s+apply\b(?!.*--local)/i,
  /\bopennextjs-cloudflare\s+(deploy|upload)\b/i,
  /\bnpm\s+run\s+(deploy|release|upload)\b/i,
  /\bnpx\s+.*\bdeploy\b/i,
];

function block(msg) {
  process.stderr.write(`ZEDPATH GUARD BLOCKED: ${msg}\n`);
  process.exit(2);
}

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

// Most recent message Praveen actually typed (skips tool results and meta entries).
function lastUserText(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    let e;
    try { e = JSON.parse(lines[i]); } catch { continue; }
    if (e.type !== 'user' || e.isMeta || !e.message) continue;
    const c = e.message.content;
    let texts = [];
    if (typeof c === 'string') texts = [c];
    else if (Array.isArray(c)) {
      if (c.some(b => b && b.type === 'tool_result')) continue;
      texts = c.filter(b => b && b.type === 'text').map(b => b.text);
    }
    const cleaned = texts
      .map(t => t.replace(/<(system-reminder|ide_[a-z_]+|command-[a-z-]+)[^>]*>[\s\S]*?<\/\1>/g, '').trim())
      .filter(Boolean);
    if (cleaned.length) return cleaned.join('\n');
  }
  return '';
}

function pinnedAccountId(projectDir) {
  for (const f of ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml']) {
    const p = path.join(projectDir, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/["']?account_id["']?\s*[:=]\s*["']([0-9a-f]{32})["']/i);
    return { file: f, id: m ? m[1] : null };
  }
  return { file: null, id: null };
}

function requireGo(input, what) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const { file, id } = pinnedAccountId(projectDir);
  if (!file) block(`${what} needs a wrangler config with account_id pinned to the ZedPath account. None found.`);
  if (!id) block(`${what}: ${file} has no account_id. Pin the ZedPath account id first.`);
  if (isSalonId(id)) block(`${what}: ${file} is pinned to the SALON account. Stop and tell Praveen.`);
  const said = lastUserText(input.transcript_path);
  if (!/^\s*GO\b/.test(said)) {
    block(`${what} is outward-facing. Check \`npx wrangler whoami\`, show Praveen the account, and ask for an explicit GO. ` +
          `His latest message must start with "GO".`);
  }
}

// Rule 8: one public repo (PraveenBanneka/zedpath); every other repo is off-limits.
function checkGitHub(cmd, input) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const m = cmd.match(/\bgh\s+repo\s+(create|edit|delete|archive|unarchive|rename|fork|set-default)\b(.*)/i);
  if (m) {
    const [, verb, rest] = m;
    const gitCfg = path.join(projectDir, '.git', 'config');
    const hasRemote = fs.existsSync(gitCfg) && /\[remote "/.test(fs.readFileSync(gitCfg, 'utf8'));
    const createOurs = verb.toLowerCase() === 'create' && /^\s*PraveenBanneka\/zedpath\s/i.test(rest + ' ') && !hasRemote;
    if (!createOurs) block(`"gh repo ${verb}" is not allowed. Only the one ZedPath repo exists, and other repos are never touched (rule 8).`);
  }
  if (/\bgh\s+api\b/i.test(cmd) && /(-X|--method)\s*(POST|PUT|PATCH|DELETE)/i.test(cmd) && !/repos\/PraveenBanneka\/zedpath\b/i.test(cmd)) {
    block('gh api write calls are only allowed against repos/PraveenBanneka/zedpath (rule 8).');
  }
  if (/\bgit\s+remote\s+(add|set-url)\b/i.test(cmd) && !OUR_REPO.test(cmd)) {
    block('git remotes may only point to github.com/PraveenBanneka/zedpath (rule 8).');
  }
  if (/\bgit\s+push\b/i.test(cmd)) {
    const urls = cmd.match(/(https?:\/\/|git@)\S+/gi) || [];
    if (urls.some(u => !OUR_REPO.test(u))) block('git push to a URL other than PraveenBanneka/zedpath (rule 8).');
    const gitCfg = path.join(projectDir, '.git', 'config');
    const cfg = fs.existsSync(gitCfg) ? fs.readFileSync(gitCfg, 'utf8') : '';
    const remoteUrls = [...cfg.matchAll(/^\s*url\s*=\s*(.+)$/gim)].map(x => x[1].trim());
    if (remoteUrls.some(u => !OUR_REPO.test(u))) block('this repo has a remote that is not PraveenBanneka/zedpath. Stop and tell Praveen (rule 8).');
    if (/\s(--force|-f|--force-with-lease)\b/i.test(cmd)) requireGoOnly(input, 'force-push rewrites public history');
  }
}

function requireGoOnly(input, what) {
  if (!/^\s*GO\b/.test(lastUserText(input.transcript_path))) {
    block(`${what}. Ask Praveen for an explicit GO; his latest message must start with "GO".`);
  }
}

const input = readStdin();
const tool = input.tool_name || '';
const ti = input.tool_input || {};

// Cloudflare MCP (plugin) — can act on the account directly; read/search is fine, anything else needs GO.
if (/^mcp__.*cloudflare/i.test(tool)) {
  if (/docs|search/i.test(tool)) process.exit(0);
  requireGo(input, `Cloudflare MCP tool ${tool}`);
  process.exit(0);
}

// File tools: keep out of the salon folder.
const fileish = [ti.file_path, ti.path, ti.notebook_path, ti.pattern].filter(Boolean).join(' ');
if (fileish && SALON_DIR_PATTERN.test(fileish)) block('the salon folder is not part of this project (rule 1).');

const cmd = ti.command;
if (typeof cmd !== 'string') process.exit(0);

if (SALON_DIR_PATTERN.test(cmd)) block('the salon folder is not part of this project (rule 1).');
if ((cmd.match(/\b[0-9a-f]{32}\b/gi) || []).some(isSalonId)) {
  block('command references the SALON Cloudflare account. Stop and tell Praveen.');
}
for (const re of ACCOUNT_SWITCH) {
  if (re.test(cmd)) block('switching Cloudflare accounts is done by Praveen by hand, never by Claude (rule 7).');
}
checkGitHub(cmd, input);
for (const re of OUTWARD) {
  if (re.test(cmd)) { requireGo(input, `"${cmd.slice(0, 80)}"`); break; }
}
process.exit(0);
