import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

// One root secret, split into independent keys so token encryption and session
// signing never share key material.
function subkey(root: string, label: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(root)) throw new Error('TOKEN_ENC_KEY must be 32 bytes of hex');
  return Buffer.from(hkdfSync('sha256', Buffer.from(root, 'hex'), Buffer.alloc(0), `kyvo:${label}`, 32));
}

/** AES-256-GCM. Output: iv.tag.ciphertext, each base64url. */
export function encryptToken(plaintext: string, root: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', subkey(root, 'refresh-token'), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptToken(encoded: string, root: string): string {
  const [iv, tag, ciphertext] = encoded.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', subkey(root, 'refresh-token'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export type SessionData = { userId: string; email: string; exp: number };

export function signSession(data: SessionData, root: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = createHmac('sha256', subkey(root, 'session')).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySession(cookie: string | undefined, root: string, now: number = Date.now()): SessionData | null {
  if (!cookie) return null;
  const [payload, signature] = cookie.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', subkey(root, 'session')).update(payload).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionData;
    return data.exp > now ? data : null;
  } catch {
    return null;
  }
}
