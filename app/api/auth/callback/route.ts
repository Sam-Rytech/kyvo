import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { tokens, users } from '@/db/schema';
import { encryptToken } from '@/lib/auth/crypto';
import { exchangeCode } from '@/lib/auth/google';
import { setSession } from '@/lib/auth/session';
import { userHash } from '@/lib/memory/namespaces';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(`${url.origin}/?auth_error=${reason}`);

  const store = await cookies();
  const expectedState = store.get('kyvo_oauth_state')?.value;
  const verifier = store.get('kyvo_oauth_verifier')?.value;
  store.delete({ name: 'kyvo_oauth_state', path: '/api/auth' });
  store.delete({ name: 'kyvo_oauth_verifier', path: '/api/auth' });

  const code = url.searchParams.get('code');
  if (url.searchParams.get('error')) return fail('denied');
  if (!code || !verifier || !expectedState || url.searchParams.get('state') !== expectedState) return fail('state');

  try {
    const identity = await exchangeCode(code, `${url.origin}/api/auth/callback`, verifier);
    if (!identity.grantedGmail) return fail('gmail_scope');

    const salt = process.env.NS_SALT;
    const key = process.env.TOKEN_ENC_KEY;
    if (!salt || !key) throw new Error('NS_SALT and TOKEN_ENC_KEY must be set');

    const userId = userHash(identity.sub, salt);
    const db = createDb();
    await db.insert(users).values({ id: userId, email: identity.email }).onConflictDoUpdate({ target: users.id, set: { email: identity.email } });
    if (identity.refreshToken) {
      const refreshTokenEnc = encryptToken(identity.refreshToken, key);
      await db.insert(tokens).values({ userId, refreshTokenEnc }).onConflictDoUpdate({ target: tokens.userId, set: { refreshTokenEnc, updatedAt: new Date() } });
    }
    await setSession(userId, identity.email);

    const [user] = await db.select({ providers: users.providers }).from(users).where(eq(users.id, userId));
    return NextResponse.redirect(`${url.origin}${user.providers.length ? '/subscriptions' : '/onboarding'}`);
  } catch (error) {
    console.error('sign-in failed:', (error as Error).name);
    return fail('exchange');
  }
}
