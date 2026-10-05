import { describe, expect, it } from 'vitest';
import { deriveKey } from './kdf.ts';
import { KDF_ITERATIONS } from './account.ts';

const SALT = '73616c74';                      // the ASCII bytes of "salt"

describe('deriveKey (PBKDF2-HMAC-SHA256)', () => {
  it('matches the published test vectors (RFC 6070 inputs, SHA-256)', async () => {
    expect(await deriveKey('password', SALT, 1)).toBe('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
    expect(await deriveKey('password', SALT, 2)).toBe('ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43');
  });
  it('pins the default work factor at 600 000 rounds (OWASP 2023 for PBKDF2-SHA256)', () => {
    expect(KDF_ITERATIONS).toBe(600_000);
  });
  it('gives a 64-character lowercase hex key, different per salt', async () => {
    const a = await deriveKey('correct horse', '00112233445566778899aabbccddeeff', 10);
    const b = await deriveKey('correct horse', 'ffeeddccbbaa99887766554433221100', 10);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});
