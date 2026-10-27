// Course groups (CR-002, FR-703 to FR-705): the rules the phone, the Worker and each group's room share. Pure
// functions, so they are tested without a network. Messages are text only, short, rate-limited and screened by an
// automatic moderation model before anyone else sees them; members can report and block.

export const MESSAGE_MAX = 500;
export const HISTORY_LIMIT = 60;                 // messages sent to a member when they open the room
export const REPORTS_TO_HIDE = 3;                // distinct members reporting one message hide it for everyone
export const POST_GAP_MS = 3_000;                // at most one message every 3 seconds per member per room
export const POST_WINDOW_MS = 10 * 60_000;
export const POST_WINDOW_MAX = 20;               // and at most 20 in any 10 minutes
export const INVITE_RE = /^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/;   // same shape as a recovery code: 80 random bits
export const INVITE_DAYS = 14;
export const REPORT_REASONS = ['HARMFUL', 'WRONG_INFO', 'SPAM', 'OTHER'] as const;
export type ReportReason = typeof REPORT_REASONS[number];
/** CR-005: the group rules a member accepts before taking part (mirrored by the CHECK in migration 0009). The wording
 *  is on the phone (gr.rule.1 to gr.rule.6 in every language); a new version means a new value here and in the CHECK. */
export const GROUP_RULES_VERSION = '2026-10-11';
export const GROUP_RULE_COUNT = 6;
/** Course groups everyone sees under "Popular" (Medicine, Engineering, Computer Science, Management, Commerce, Law). */
export const POPULAR_COURSES = ['001', '008', '012', '016', '018', '025'];
/** CR-014 (Praveen 2026-10-23): standing groups for students heading to other paths, two for professional bodies, one
 *  for the Open University, two for government job exams. Keys mirrored by the CHECK in migration 0013; each names the
 *  route group it belongs to and the routes it is about (the group page links them). Their names are in the i18n files
 *  (gp.<key>); the Worker creates them on the first listing, so everyone, the demo included, can join. */
export const PATH_GROUPS = [
  { key: 'PROF_ACCOUNTING', routeGroup: 'PROFESSIONAL', routeIds: ['R028', 'R029', 'R030', 'R031', 'R096', 'R097', 'R102'] },
  { key: 'PROF_BUSINESS', routeGroup: 'PROFESSIONAL', routeIds: ['R098', 'R099', 'R100', 'R101'] },
  { key: 'OUSL', routeGroup: 'DIPLOMA', routeIds: ['R023', 'R024', 'R025'] },
  { key: 'GOV_CUSTOMS', routeGroup: 'JOB_EXAM', routeIds: ['R043'] },
  { key: 'GOV_MSO', routeGroup: 'JOB_EXAM', routeIds: ['R044'] },
] as const;
export type PathKey = typeof PATH_GROUPS[number]['key'];
export const isPathKey = (x: unknown): x is PathKey => PATH_GROUPS.some(p => p.key === x);

export interface GroupSummary {
  id: number | null;                             // null until someone joins (groups are created on first join)
  kind: 'COURSE' | 'BATCH' | 'PATH';
  courseCode: string | null;
  pathKey: PathKey | null;                       // CR-014: the path group's key
  title: string;                                 // English, for logs and tests; the phone words its own from name
  subtitle: string;
  name: string;                                  // the course name, or "stream · district" for a batch
  universities: number;                          // COURSE: how many universities offer it
  members: number;
  joined: boolean;
  rulesAccepted: boolean;                        // CR-006: this account accepted the current group rules (once, for every group)
}
export interface GroupsResponse { groups: GroupSummary[]; popular: GroupSummary[]; paths: GroupSummary[]; role: 'STUDENT' | 'SENIOR' | 'OTHER'; rulesAccepted: boolean }
/** CR-006: a member as shown on the group's info page: the username (never the name), the preset avatar, the badge. */
export interface GroupMemberInfo { username: string; avatar: string | null; badge: string | null }
/** sample: a labelled sample message (shared/group-samples.ts), never a real member's. */
export interface ChatMessage { id: string; author: string; badge: string | null; body: string; at: string; sample?: true;
  /** CR-006: the author's avatar when they posted (a snapshot, like the author name). */
  avatar?: string | null }
export type ServerFrame =
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'message'; message: ChatMessage }
  | { type: 'hidden'; id: string }
  | { type: 'error'; error: string };
export type ClientFrame = { type: 'post'; body: string };

/** Group rule 3, enforced by the room: no phone numbers (Sri Lankan, any spacing) and no email addresses. */
const CONTACT_RE = /(?:\+\s?94|\b94|\b0)(?:[\s-]?\d){9}\b|[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
// Audit lead 16 / GRP-012..016: the same check on a normalised copy, so look-alike and disguised forms are caught too:
// full-width digits (NFKC), invisible characters, dots/brackets/slashes between digits, a letter stuck to the end,
// 0094 prefixes, spelled-out digits, "[at]"/"(dot)" emails and WhatsApp invite links. Years, index numbers and
// Z-scores stay allowed (they are not 0- or 94-led 10-digit runs).
const DIGIT_WORDS: Record<string, string> = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9' };
const LOOSE_PHONE_RE = /(?:\+|00)?(?:94|0)(?:[\s().\-/_]*\d){9}(?!\d)/;
const LOOSE_EMAIL_RE = /[a-z0-9._%+-]+\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\s+at\s+)\s*[a-z0-9-]+(?:\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+)\s*[a-z0-9-]+)*\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+)\s*(?:com|lk|net|org|edu|gov|io|co)\b/i;
const CHAT_LINK_RE = /chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|whatsapp\.com\/(?:invite|send)/i;
export function looksLikeContact(text: string): boolean {
  const n = text.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
    .replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi, w => DIGIT_WORDS[w.toLowerCase()]);
  return CONTACT_RE.test(n) || LOOSE_PHONE_RE.test(n) || LOOSE_EMAIL_RE.test(n) || CHAT_LINK_RE.test(n);
}

/** Trims and checks a message: text only, 1 to 500 characters, no control characters except new lines. */
export function cleanMessage(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Messages are text only' };
  const body = raw.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return { ok: false, error: 'Write a message first' };
  if (body.length > MESSAGE_MAX) return { ok: false, error: `Keep it under ${MESSAGE_MAX} characters` };
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(body)) return { ok: false, error: 'That message has characters FindMyWay cannot show' };
  if (looksLikeContact(body)) return { ok: false, error: 'For your safety, phone numbers and email addresses cannot be shared in groups' };
  return { ok: true, body };
}

/** Rate limit for one member in one room. `recent` = that member's earlier post times (ms), any order. */
export function canPost(recent: number[], now: number): { ok: true } | { ok: false; error: string } {
  const inWindow = recent.filter(t => now - t < POST_WINDOW_MS);
  if (inWindow.some(t => now - t < POST_GAP_MS)) return { ok: false, error: 'Slow down a little: one message every few seconds' };
  if (inWindow.length >= POST_WINDOW_MAX) return { ok: false, error: 'You have sent a lot of messages. Take a short break and try again' };
  return { ok: true };
}

/**
 * Reads the moderation model's verdict (Llama Guard on Workers AI). It answers "safe", or "unsafe" plus category
 * codes; some versions return an object with a `safe` flag. Anything unreadable counts as NOT safe: fail closed.
 */
export function moderationSays(output: unknown): 'SAFE' | 'UNSAFE' {
  const r = (output as { response?: unknown } | null)?.response ?? output;
  if (r && typeof r === 'object' && 'safe' in r) return (r as { safe: unknown }).safe === true ? 'SAFE' : 'UNSAFE';
  if (typeof r === 'string') return /^\s*safe\b/i.test(r) ? 'SAFE' : 'UNSAFE';
  return 'UNSAFE';
}

/** The badge shown next to a verified senior's name, e.g. "Verified senior · Computer Science, year 2". */
export const seniorBadge = (course: string, year: number) => `Verified senior · ${course}, year ${year}`;

/** Messages a member sees: not hidden, and not from anyone they blocked. */
export const visibleTo = <T extends { accountId: number; hidden: boolean }>(msgs: T[], blocked: number[]) =>
  msgs.filter(m => !m.hidden && !blocked.includes(m.accountId));
