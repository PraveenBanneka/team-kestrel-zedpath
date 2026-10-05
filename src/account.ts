// Client side of student accounts (CR-001). The password is stretched here (PBKDF2, 600 000 rounds) and only the
// derived key is sent; the session lives in an HttpOnly cookie the page script cannot read.
import type { ProfileInput } from '../shared/api.ts';
import type { Extras, MeResponse, SaltResponse, SignupResponse } from '../shared/account.ts';
import { normaliseUsername } from '../shared/account.ts';
import { deriveKey } from '../shared/kdf.ts';

export class ApiFailure extends Error {
  constructor(readonly status: number, message: string, readonly field?: string) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiFailure(0, 'No connection. Check your internet and try again');
  }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiFailure(r.status, data.error ?? `Something went wrong (${r.status})`, data.field);
  return data as T;
}

async function keyFor(username: string, password: string): Promise<string> {
  const { salt } = await call<SaltResponse>('POST', '/auth/salt', { username });
  return deriveKey(password, salt);
}

/** null when not logged in, or when accounts are not available on this server. */
export async function fetchMe(): Promise<MeResponse | null> {
  try { return await call<MeResponse>('GET', '/me'); } catch (e) {
    if (e instanceof ApiFailure && (e.status === 401 || e.status === 503 || e.status === 404)) return null;
    throw e;
  }
}

export async function signUp(username: string, password: string, profile: ProfileInput | null, extras: Extras): Promise<SignupResponse> {
  const u = normaliseUsername(username);
  return call<SignupResponse>('POST', '/auth/signup', { username: u, key: await keyFor(u, password), profile, extras });
}

export async function logIn(username: string, password: string): Promise<MeResponse> {
  const u = normaliseUsername(username);
  return call<MeResponse>('POST', '/auth/login', { username: u, key: await keyFor(u, password) });
}

export async function recover(username: string, code: string, newPassword: string): Promise<SignupResponse> {
  const u = normaliseUsername(username);
  return call<SignupResponse>('POST', '/auth/recover', { username: u, code, key: await keyFor(u, newPassword) });
}

export const saveMe = (profile: ProfileInput, extras: Extras) => call<MeResponse>('PUT', '/me', { profile, extras });
export const logOut = () => call<void>('POST', '/auth/logout');
export const logOutEverywhere = () => call<void>('POST', '/auth/logout-all');
export const deleteAccount = () => call<void>('DELETE', '/me');
