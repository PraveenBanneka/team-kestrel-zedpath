// Makes a one-time invite code for a verified senior (CR-002). Praveen checks the senior himself first (their
// university and year), then runs:
//   node tools/groups/make-invite.ts <Uni-Code> <study year>      e.g.  node tools/groups/make-invite.ts 012F 2
// It prints the code (give it to the senior privately; it is never stored in plain form) and writes the SQL that
// stores only its SHA-256 to a file OUTSIDE the repo. Storing it in the live database is outward-facing: the printed
// `wrangler d1 execute ... --remote` command is GO-gated by the guard.
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { INVITE_DAYS, INVITE_RE } from '../../shared/groups.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'worker', 'generated', 'rulebook-2025-2026.json'), 'utf8')) as {
  offerings: { uniCode: string; course: string; institution: string }[];
};
const [uniCode = '', yearArg = ''] = process.argv.slice(2).map(s => s.toUpperCase());
const offering = book.offerings.find(o => o.uniCode === uniCode);
const year = Number(yearArg);
if (!offering || !Number.isInteger(year) || year < 1 || year > 6) {
  console.error('Usage: node tools/groups/make-invite.ts <Uni-Code, e.g. 012F> <study year 1-6>');
  process.exit(1);
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
let bits = 0, val = 0, code = '';
for (const x of randomBytes(10)) { val = ((val << 8) | x) & 0xfff; bits += 8; while (bits >= 5) { code += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
code = code.match(/.{4}/g)!.join('-');
if (!INVITE_RE.test(code)) throw new Error('internal: bad code shape');

const now = new Date(), expires = new Date(now.getTime() + INVITE_DAYS * 86_400_000);
const hash = createHash('sha256').update(code).digest('hex');
const sql = `INSERT INTO senior_invite (code_hash, course_code, institution_letter, study_year, created_at, expires_at)
VALUES ('${hash}', '${uniCode.slice(0, 3)}', '${uniCode.slice(3)}', ${year}, '${now.toISOString()}', '${expires.toISOString()}');\n`;
const file = path.join(os.tmpdir(), `zedpath-invite-${now.getTime()}.sql`);
fs.writeFileSync(file, sql);

console.log(`Invite for: ${offering.course} at ${offering.institution}, year ${year}`);
console.log(`Code (give it to the senior privately): ${code}`);
console.log(`Expires: ${expires.toISOString().slice(0, 10)} (${INVITE_DAYS} days)`);
console.log(`Store it (needs GO):  npx wrangler d1 execute zedpath --remote --file "${file}"`);
console.log(`Local testing:         npx wrangler d1 execute zedpath --local --file "${file}"`);
