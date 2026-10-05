// Password stretching done on the phone (CR-001): key = PBKDF2-SHA256(password, salt, 600 000 rounds), 256 bits, hex.
// Only this key is sent; the password itself never leaves the device. WebCrypto, so it runs natively in browsers.
import { KDF_ITERATIONS } from './account.ts';

export async function deriveKey(password: string, saltHex: string, iterations = KDF_ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array((saltHex.match(/../g) ?? []).map(h => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
