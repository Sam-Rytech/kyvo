import { and, asc, eq, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { cacheEvents, drainState, outbox } from '@/db/schema';
import type { DrainStore, DrainWindow, OutboxRow } from './drainer';
import { decodeEnvelope } from './envelope';

const rowColumns = {
  id: outbox.id,
  namespace: outbox.namespace,
  text: outbox.text,
  idempotencyKey: outbox.idempotencyKey,
  batchKey: outbox.batchKey,
  jobId: outbox.jobId,
  attempts: outbox.attempts,
};

/** Adds events to the outbox. A repeated idempotency key is ignored. */
export async function enqueue(db: Db, items: { userId: string; namespace: string; text: string; idempotencyKey: string }[]) {
  if (items.length === 0) return;
  await db.insert(outbox).values(items).onConflictDoNothing({ target: outbox.idempotencyKey });
}

export function postgresDrainStore(db: Db): DrainStore {
  return {
    async acquire(now, leaseMs) {
      await db.insert(drainState).values({ id: 1 }).onConflictDoNothing();
      const [row] = await db
        .update(drainState)
        .set({ lockedUntil: new Date(now.getTime() + leaseMs) })
        .where(and(eq(drainState.id, 1), lt(drainState.lockedUntil, now)))
        .returning();
      return row ? { blockedUntil: row.blockedUntil, windowStartedAt: row.windowStartedAt, windowCount: row.windowCount } : null;
    },
    async release(window: DrainWindow) {
      await db
        .update(drainState)
        .set({ ...window, lockedUntil: new Date(0) })
        .where(eq(drainState.id, 1));
    },
    submitted: () => db.select(rowColumns).from(outbox).where(eq(outbox.status, 'submitted')).orderBy(asc(outbox.id)) as Promise<OutboxRow[]>,
    sending: () => db.select(rowColumns).from(outbox).where(eq(outbox.status, 'sending')).orderBy(asc(outbox.id)) as Promise<OutboxRow[]>,
    pending: (limit) => db.select(rowColumns).from(outbox).where(eq(outbox.status, 'pending')).orderBy(asc(outbox.id)).limit(limit) as Promise<OutboxRow[]>,
    async claim(ids, key) {
      await db.update(outbox).set({ status: 'sending', batchKey: key, updatedAt: sql`now()` }).where(inArray(outbox.id, ids));
    },
    async markSubmitted(jobs) {
      for (const job of jobs) {
        await db.update(outbox).set({ status: 'submitted', jobId: job.jobId, updatedAt: sql`now()` }).where(eq(outbox.id, job.id));
      }
    },
    async markStored(id, blobId) {
      const [row] = await db
        .update(outbox)
        .set({ status: 'stored', blobId, updatedAt: sql`now()` })
        .where(eq(outbox.id, id))
        .returning();
      if (row) await cacheMemory(db, { userId: row.userId, namespace: row.namespace, text: row.text, blobId, writtenAt: new Date() });
    },
    async markRetry(id, attempts, error, giveUp) {
      await db
        .update(outbox)
        .set({ status: giveUp ? 'failed' : 'pending', attempts, lastError: error.slice(0, 500), jobId: null, batchKey: null, updatedAt: sql`now()` })
        .where(eq(outbox.id, id));
    },
  };
}

/** Decodes one memory into the cache. Lines that don't parse are ignored (architecture §6.2). */
export async function cacheMemory(db: Db, memory: { userId: string; namespace: string; text: string; blobId: string; writtenAt: Date | null }) {
  const decoded = decodeEnvelope(memory.text);
  if (!decoded) return false;
  await db
    .insert(cacheEvents)
    .values({
      userId: memory.userId,
      namespace: memory.namespace,
      type: decoded.event.t,
      merchant: decoded.event.m ?? null,
      eventDate: decoded.event.d ?? null,
      sentence: decoded.sentence,
      event: decoded.event,
      blobId: memory.blobId,
      writtenAt: memory.writtenAt,
    })
    .onConflictDoNothing({ target: cacheEvents.blobId });
  return true;
}
