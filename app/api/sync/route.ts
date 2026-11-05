import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { pendingForecastMemories } from '@/lib/engines/hindcast';
import { getMemWal } from '@/lib/memory/client';
import { drainOnce } from '@/lib/memory/drainer';
import { outboxCounts } from '@/lib/memory/status';
import { enqueue, postgresDrainStore } from '@/lib/memory/store';

export const maxDuration = 60;

/** Queues any new forecasts and results, sends one paced batch, and says what's left. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const db = createDb();
  try {
    const [events, [user]] = await Promise.all([
      db.select().from(cacheEvents).where(eq(cacheEvents.userId, session.userId)),
      db.select({ homeCurrency: users.homeCurrency }).from(users).where(eq(users.id, session.userId)),
    ]);
    const pending = pendingForecastMemories(events, session.userId, user?.homeCurrency, today());
    await enqueue(db, pending.map(({ userId, namespace, text, idempotencyKey }) => ({ userId, namespace, text, idempotencyKey })));

    const drain = await drainOnce(postgresDrainStore(db), getMemWal());
    const counts = await outboxCounts(db, session.userId);
    return NextResponse.json({ open: counts.open, stored: counts.stored, error: drain.error ? 'Walrus Memory is busy. Retrying.' : null });
  } catch (error) {
    console.error('sync failed:', (error as Error).name);
    return NextResponse.json({ error: 'Sync failed' }, { status: 502 });
  }
}
