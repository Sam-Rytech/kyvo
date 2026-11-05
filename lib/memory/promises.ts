import { eq } from 'drizzle-orm';
import type { Db } from '@/db';
import { cacheEvents } from '@/db/schema';
import { today } from '@/lib/engines/dates';
import { encodeEnvelope } from './envelope';
import { eventKey, namespaces, sha256 } from './namespaces';
import { enqueue } from './store';

/** "Cancel Canva" becomes a promise, linked to the merchant if Kyvo knows it. Used by the app and the bot. */
export async function addPromise(db: Db, userId: string, text: string) {
  const d = today();
  const known = await db.select({ merchant: cacheEvents.merchant, event: cacheEvents.event }).from(cacheEvents).where(eq(cacheEvents.userId, userId));
  const lower = text.toLowerCase();
  const match = known.find((row) => typeof row.event.name === 'string' && row.merchant && lower.includes(row.event.name.toLowerCase()));

  const pid = sha256(`${userId}|${text}`).slice(0, 16);
  const h = eventKey({ userId, type: 'promise', merchant: pid, date: d });
  await enqueue(db, [
    {
      userId,
      namespace: namespaces.promises(userId),
      idempotencyKey: h,
      text: encodeEnvelope(`On ${d} the user said: "${text.replace(/#ky/g, 'ky')}".`, { v: 1, t: 'promise', pid, m: match?.merchant ?? undefined, text, status: 'open', d, src: 'user', h }),
    },
  ]);
}

export async function resolvePromise(db: Db, userId: string, id: string, text: string) {
  const d = today();
  const h = eventKey({ userId, type: 'promise:done', merchant: id });
  await enqueue(db, [
    {
      userId,
      namespace: namespaces.promises(userId),
      idempotencyKey: h,
      text: encodeEnvelope(`On ${d} the user kept this promise: "${text.replace(/#ky/g, 'ky')}".`, { v: 1, t: 'promise', pid: id, text, status: 'done', d, src: 'user', h }),
    },
  ]);
}
