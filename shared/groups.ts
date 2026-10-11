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

export interface GroupSummary {
  id: number | null;                             // null until someone joins (groups are created on first join)
  kind: 'COURSE' | 'BATCH';
  courseCode: string | null;
  title: string;                                 // English, for logs and tests; the phone words its own from name
  subtitle: string;
  name: string;                                  // the course name, or "stream · district" for a batch
  universities: number;                          // COURSE: how many universities offer it
  members: number;
  joined: boolean;
}
export interface GroupsResponse { groups: GroupSummary[]; role: 'STUDENT' | 'SENIOR' | 'OTHER' }
export interface ChatMessage { id: string; author: string; badge: string | null; body: string; at: string }
export type ServerFrame =
  | { type: 'history'; messages: ChatMessage[] }
  | { type: 'message'; message: ChatMessage }
  | { type: 'hidden'; id: string }
  | { type: 'error'; error: string };
export type ClientFrame = { type: 'post'; body: string };

/** Trims and checks a message: text only, 1 to 500 characters, no control characters except new lines. */
export function cleanMessage(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Messages are text only' };
  const body = raw.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return { ok: false, error: 'Write a message first' };
  if (body.length > MESSAGE_MAX) return { ok: false, error: `Keep it under ${MESSAGE_MAX} characters` };
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(body)) return { ok: false, error: 'That message has characters ZedPath cannot show' };
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
