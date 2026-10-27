// Client for Ask FindMyWay. Sends the question and, if entered, the student's results (used for the answer, not stored).
// The device id is a random UUID kept on this phone; the server only ever stores a daily-salted hash of it, to count
// the daily allowance fairly when many students share one school network.
import type { ProfileInput } from '../shared/api.ts';
import type { AskFeedback, AskResponse } from '../shared/ask.ts';
import type { Extras } from '../shared/account.ts';
import { getLang } from './i18n/index.ts';

const DEVICE_KEY = 'zedpath.device.v1';
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return ''; }
}

export async function askZedPath(question: string, profile: ProfileInput | null, extras: Extras | null = null): Promise<AskResponse> {
  let r: Response;
  try {
    r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-FindMyWay-Device': deviceId() },
      body: JSON.stringify({ question, profile, extras, lang: getLang() }) });   // the app language guides an unclear question
  } catch {
    throw new Error('No connection. Check your internet and try again.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? `Something went wrong (${r.status})`);
  return data as AskResponse;
}

/** CR-004: 'Helpful' or 'Report a wrong answer'. Sends the question, the answer and its pages, nothing else. */
export async function sendFeedback(f: AskFeedback): Promise<void> {
  const r = await fetch('/api/ask/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Could not send. Try again.');
}
