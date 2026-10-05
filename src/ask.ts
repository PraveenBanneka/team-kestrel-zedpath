// Client for Ask ZedPath. Sends the question and, if entered, the student's results (used for the answer, not stored).
// The device id is a random UUID kept on this phone; the server only ever stores a daily-salted hash of it, to count
// the daily allowance fairly when many students share one school network.
import type { ProfileInput } from '../shared/api.ts';
import type { AskResponse } from '../shared/ask.ts';

const DEVICE_KEY = 'zedpath.device.v1';
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return ''; }
}

export async function askZedPath(question: string, profile: ProfileInput | null): Promise<AskResponse> {
  let r: Response;
  try {
    r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ZedPath-Device': deviceId() },
      body: JSON.stringify({ question, profile }) });
  } catch {
    throw new Error('No connection. Check your internet and try again.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? `Something went wrong (${r.status})`);
  return data as AskResponse;
}
