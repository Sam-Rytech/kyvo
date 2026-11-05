import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, signSession, verifySession } from '@/lib/auth/crypto';
import { identityFromIdToken } from '@/lib/auth/google';

const ROOT = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);

describe('refresh token encryption', () => {
  it('round-trips and never contains the plaintext', () => {
    const encrypted = encryptToken('1//refresh-token', ROOT);
    expect(encrypted).not.toContain('refresh-token');
    expect(decryptToken(encrypted, ROOT)).toBe('1//refresh-token');
  });

  it('uses a new IV each time', () => {
    expect(encryptToken('x', ROOT)).not.toBe(encryptToken('x', ROOT));
  });

  it('rejects a wrong key and tampered data', () => {
    const encrypted = encryptToken('secret', ROOT);
    expect(() => decryptToken(encrypted, OTHER)).toThrow();
    const [iv, tag, data] = encrypted.split('.');
    expect(() => decryptToken([iv, tag, Buffer.from('tampered').toString('base64url') + data].join('.'), ROOT)).toThrow();
  });

  it('refuses a malformed key', () => {
    expect(() => encryptToken('x', 'short')).toThrow();
  });
});

describe('session cookie', () => {
  const session = { userId: 'u1', email: 'a@b.c', exp: 2000 };

  it('verifies a valid session', () => {
    expect(verifySession(signSession(session, ROOT), ROOT, 1000)).toEqual(session);
  });

  it('rejects expiry, a wrong key, tampering and junk', () => {
    const cookie = signSession(session, ROOT);
    expect(verifySession(cookie, ROOT, 3000)).toBeNull();
    expect(verifySession(cookie, OTHER, 1000)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ ...session, userId: 'victim' })).toString('base64url');
    expect(verifySession(`${forged}.${cookie.split('.')[1]}`, ROOT, 1000)).toBeNull();
    expect(verifySession(undefined, ROOT)).toBeNull();
    expect(verifySession('junk', ROOT)).toBeNull();
  });
});

describe('Google ID token claims', () => {
  const token = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
  const valid = { iss: 'https://accounts.google.com', aud: 'client', exp: 2000, sub: 's1', email: 'a@b.c' };

  it('accepts valid claims', () => {
    expect(identityFromIdToken(token(valid), 'client', 1000)).toEqual({ sub: 's1', email: 'a@b.c' });
  });

  it.each([
    ['wrong audience', { ...valid, aud: 'other' }],
    ['wrong issuer', { ...valid, iss: 'https://evil.example' }],
    ['expired', { ...valid, exp: 1 }],
    ['no subject', { ...valid, sub: undefined }],
  ])('rejects %s', (_name, claims) => {
    expect(() => identityFromIdToken(token(claims), 'client', 1000)).toThrow();
  });
});
