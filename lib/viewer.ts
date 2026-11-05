import { getSession } from '@/lib/auth/session';
import { userHash } from '@/lib/memory/namespaces';

export type Viewer = { userId: string; email: string | null; readOnly: boolean };

/**
 * Signed in: your own data. Signed out: the demo account, read-only, so anyone can try the real
 * product while Gmail sign-in is limited to approved testers. Every write route still needs a session.
 */
export async function getViewer(): Promise<Viewer> {
  const session = await getSession();
  if (session) return { userId: session.userId, email: session.email, readOnly: false };
  return { userId: userHash('demo-account', process.env.NS_SALT as string), email: null, readOnly: true };
}
