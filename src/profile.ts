// The student's profile lives only on this device (FR-104, NFR-030): localStorage, never the server's database.
import type { ProfileInput } from '../shared/api.ts';

const KEY = 'zedpath.profile.v1';

export function loadProfile(): ProfileInput | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as ProfileInput : null; } catch { return null; }
}
export function saveProfile(p: ProfileInput): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: the profile simply is not remembered */ }
}
export function clearProfile(): void {                                                    // FR-106
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}
