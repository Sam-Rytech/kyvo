import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { tokens, users } from '@/db/schema';
import { decryptToken } from '@/lib/auth/crypto';
import { ReauthRequiredError, refreshAccessToken } from '@/lib/auth/google';
import { getSession } from '@/lib/auth/session';
import { createExtractor } from '@/lib/inbox/extractor';
import { createGmailClient } from '@/lib/inbox/gmail';
import { scanBatch } from '@/lib/inbox/scan';
import { postgresScanStore } from '@/lib/inbox/scan-store';
import { getMemWal } from '@/lib/memory/client';
import { drainOnce } from '@/lib/memory/drainer';
import { outboxCounts } from '@/lib/memory/status';
import { postgresDrainStore } from '@/lib/memory/store';

export const maxDuration = 60;

/** One small batch: read a few emails, then send what's queued to Walrus. The page keeps calling. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const db = createDb();
  const reauth = () => NextResponse.json({ error: 'Gmail access expired', reauth: true }, { status: 401 });

  try {
    const [[token], [user]] = await Promise.all([
      db.select().from(tokens).where(eq(tokens.userId, session.userId)),
      db.select({ homeCurrency: users.homeCurrency }).from(users).where(eq(users.id, session.userId)),
    ]);
    if (!token) return reauth();
    const accessToken = await refreshAccessToken(decryptToken(token.refreshTokenEnc, process.env.TOKEN_ENC_KEY as string));

    const scan = await scanBatch({ store: postgresScanStore(db), gmail: createGmailClient(accessToken), extract: createExtractor(user?.homeCurrency) }, session.userId);
    const drain = await drainOnce(postgresDrainStore(db), getMemWal());
    return NextResponse.json({ scan, drainError: drain.error ?? null, outbox: await outboxCounts(db, session.userId) });
  } catch (error) {
    if (error instanceof ReauthRequiredError) return reauth();
    // Names only: messages from these libraries can quote email content.
    console.error('scan failed:', (error as Error).name);
    return NextResponse.json({ error: 'Scan failed. Try again.' }, { status: 502 });
  }
}
