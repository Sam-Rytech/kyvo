import { cookies } from 'next/headers';
import { signSession, verifySession, type SessionData } from './crypto';

const COOKIE = 'kyvo_session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function root(): string {
  const key = process.env.TOKEN_ENC_KEY;
  if (!key) throw new Error('TOKEN_ENC_KEY is not set');
  return key;
}

/** The signed-in user. Namespaces always derive from this, never from a request (§9). */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return verifySession(store.get(COOKIE)?.value, root());
}

export async function setSession(userId: string, email: string) {
  const store = await cookies();
  const exp = Date.now() + THIRTY_DAYS_MS;
  store.set(COOKIE, signSession({ userId, email, exp }, root()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp),
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
