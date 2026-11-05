const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const SCOPES = 'openid email https://www.googleapis.com/auth/gmail.readonly';

/** Google says the refresh token is no longer valid, so the user has to sign in again. */
export class ReauthRequiredError extends Error {
  constructor() {
    super('Gmail access expired. Sign in again.');
    this.name = 'ReauthRequiredError';
  }
}

function credentials() {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  return { id, secret };
}

export function buildAuthUrl(redirectUri: string, state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: credentials().id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // needed for a refresh token
    prompt: 'consent', // Google only returns a refresh token on consent
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; id_token?: string; scope?: string };

async function tokenRequest(body: Record<string, string>): Promise<Response> {
  return fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15_000),
  });
}

export type GoogleIdentity = { sub: string; email: string; refreshToken: string | null; grantedGmail: boolean };

/** The ID token comes directly from Google over TLS, so its claims are checked rather than its signature. */
export function identityFromIdToken(idToken: string, clientId: string, now: number = Date.now()): { sub: string; email: string } {
  const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
  const validIssuer = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  if (!validIssuer || claims.aud !== clientId || claims.exp * 1000 <= now || !claims.sub || !claims.email) {
    throw new Error('Google returned an invalid ID token');
  }
  return { sub: claims.sub, email: claims.email };
}

export async function exchangeCode(code: string, redirectUri: string, codeVerifier: string): Promise<GoogleIdentity> {
  const { id, secret } = credentials();
  const response = await tokenRequest({
    code,
    client_id: id,
    client_secret: secret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  const tokens = (await response.json()) as TokenResponse;
  if (!tokens.id_token) throw new Error('Google did not return an ID token');
  return {
    ...identityFromIdToken(tokens.id_token, id),
    refreshToken: tokens.refresh_token ?? null,
    grantedGmail: (tokens.scope ?? '').includes('gmail.readonly'),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { id, secret } = credentials();
  const response = await tokenRequest({
    client_id: id,
    client_secret: secret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  // Testing-mode logins expire after about 7 days and surface as invalid_grant (§13).
  if (response.status === 400 || response.status === 401) throw new ReauthRequiredError();
  if (!response.ok) throw new Error(`Google token refresh failed (${response.status})`);
  return ((await response.json()) as TokenResponse).access_token;
}
