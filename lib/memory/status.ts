import { eq, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { outbox } from '@/db/schema';

export type OutboxCounts = { open: number; stored: number; failed: number };

export async function outboxCounts(db: Db, userId: string): Promise<OutboxCounts> {
  const [counts] = await db
    .select({
      open: sql<number>`count(*) filter (where ${outbox.status} in ('pending','sending','submitted'))::int`,
      stored: sql<number>`count(*) filter (where ${outbox.status} = 'stored')::int`,
      failed: sql<number>`count(*) filter (where ${outbox.status} = 'failed')::int`,
    })
    .from(outbox)
    .where(eq(outbox.userId, userId));
  return counts;
}
