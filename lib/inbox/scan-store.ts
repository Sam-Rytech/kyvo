import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '@/db';
import { scanCursors, seenMessages } from '@/db/schema';
import { enqueue } from '@/lib/memory/store';
import type { ScanStore } from './scan';

export function postgresScanStore(db: Db): ScanStore {
  return {
    async cursor(userId) {
      const [row] = await db.select().from(scanCursors).where(eq(scanCursors.userId, userId));
      return { pageToken: row?.pageToken ?? null, done: row?.done ?? false };
    },
    async saveCursor(userId, pageToken, done) {
      await db
        .insert(scanCursors)
        .values({ userId, pageToken, done })
        .onConflictDoUpdate({ target: scanCursors.userId, set: { pageToken, done, updatedAt: new Date() } });
    },
    async seen(userId, hashes) {
      if (hashes.length === 0) return new Set();
      const rows = await db
        .select({ hash: seenMessages.messageHash })
        .from(seenMessages)
        .where(and(eq(seenMessages.userId, userId), inArray(seenMessages.messageHash, hashes)));
      return new Set(rows.map((row) => row.hash));
    },
    async markSeen(userId, hash) {
      await db.insert(seenMessages).values({ userId, messageHash: hash }).onConflictDoNothing();
    },
    enqueue: (items) => enqueue(db, items),
  };
}
