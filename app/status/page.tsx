import { eq } from 'drizzle-orm';
import { createDb } from '@/db';
import { tokens } from '@/db/schema';
import { decryptToken } from '@/lib/auth/crypto';
import { refreshAccessToken } from '@/lib/auth/google';
import { getSession } from '@/lib/auth/session';
import { createGmailClient, buildQuery } from '@/lib/inbox/gmail';
import { runChecks, type ServiceCheck } from '@/lib/status';

export const metadata = { title: 'Status · Kyvo' };

/** Only for the signed-in user's own mailbox, and never cached. */
async function gmailCheck(): Promise<ServiceCheck> {
  const base = { name: 'Gmail', role: 'Finding billing emails' };
  const session = await getSession();
  if (!session) return { ...base, ok: true, ms: null, note: 'Sign in to test your own connection' };
  const [token] = await createDb().select().from(tokens).where(eq(tokens.userId, session.userId));
  if (!token) return { ...base, ok: false, ms: null, note: 'Not connected. Sign in again.' };
  const started = Date.now();
  try {
    const access = await refreshAccessToken(decryptToken(token.refreshTokenEnc, process.env.TOKEN_ENC_KEY as string));
    await createGmailClient(access).listMessages(buildQuery('2d'));
    return { ...base, ok: true, ms: Date.now() - started, note: 'Your connection works' };
  } catch {
    return { ...base, ok: false, ms: null, note: 'Access expired or unavailable. Sign in again.' };
  }
}

export default async function StatusPage() {
  const [{ checks, checkedAt }, gmail] = await Promise.all([runChecks(), gmailCheck()]);
  const all = [...checks, gmail];
  const down = all.filter((c) => !c.ok).length;

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-heading-xs font-semibold text-primary">Status</h1>
        <p role="status" className={`text-sm font-medium ${down ? 'text-utility-error-700' : 'text-utility-success-700'}`}>
          {down ? `${down} ${down === 1 ? 'service isn\'t' : 'services aren\'t'} responding` : 'Everything is responding'}
        </p>
        <p className="text-xs text-tertiary">Live checks, timed from Kyvo&apos;s server. Last run {new Date(checkedAt).toISOString().slice(11, 19)} UTC, refreshed at most once a minute.</p>
      </div>
      <ul className="rounded-xl border border-secondary bg-primary shadow-xs divide-y divide-secondary">
        {all.map((check) => (
          <li key={check.name} className="p-lg flex items-start justify-between gap-md">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">{check.name}</p>
              <p className="text-xs text-tertiary">{check.role}</p>
              <p className={`text-xs mt-xxs ${check.ok ? 'text-secondary' : 'text-utility-error-700'}`}>{check.note}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-mono font-semibold text-primary">{check.ms === null ? '—' : `${check.ms} ms`}</p>
              <p className={`text-xs font-medium ${check.ok ? 'text-utility-success-700' : 'text-utility-error-700'}`}>{check.ok ? 'Up' : 'Down'}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
