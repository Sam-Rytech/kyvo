import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/auth/google';

const TEN_MINUTES = 600;

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const store = await cookies();
  const options = { httpOnly: true, secure: origin.startsWith('https'), sameSite: 'lax' as const, path: '/api/auth', maxAge: TEN_MINUTES };
  store.set('kyvo_oauth_state', state, options);
  store.set('kyvo_oauth_verifier', verifier, options);

  return NextResponse.redirect(buildAuthUrl(`${origin}/api/auth/callback`, state, challenge));
}
