import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { createDb } from '@/db';
import { cacheEvents, outbox, seenMessages, users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { getMemWal } from '@/lib/memory/client';
import { decodeEnvelope } from '@/lib/memory/envelope';
import { decodedProfile, listUserNamespaces, REBUILD_BATCH, RebuildIncompleteError, recallNamespace } from '@/lib/memory/rebuild';
import { cacheMemory } from '@/lib/memory/store';

export const maxDuration = 60;

/**
 * Total Recall, a few namespaces per call. The first call wipes this user's cache. Everything
 * then comes back from Walrus alone, including the idempotency keys and the email dedupe list,
 * so a later scan can't write duplicates.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { userId, email } = session;

  const body = (await request.json().catch(() => ({}))) as { cursor?: unknown };
  const cursor = Number.isInteger(body.cursor) && (body.cursor as number) > 0 ? (body.cursor as number) : 0;

  const db = createDb();
  const memory = getMemWal();

  try {
    const all = await listUserNamespaces(memory, userId);
    if (cursor === 0) await db.delete(cacheEvents).where(eq(cacheEvents.userId, userId));

    const batch = all.slice(cursor, cursor + REBUILD_BATCH);
    const recalled = await Promise.all(batch.map(async (ns) => ({ ns, memories: await recallNamespace(memory, ns) })));

    let restored = 0;
    for (const { ns, memories } of recalled) {
      const profile = decodedProfile(memories.map((m) => m.text));
      if (profile) {
        const values = { homeCurrency: profile.homeCurrency ?? 'NGN', providers: profile.providers ?? [] };
        await db.insert(users).values({ id: userId, email, ...values }).onConflictDoUpdate({ target: users.id, set: values });
      }
      for (const item of memories) {
        if (await cacheMemory(db, { userId, namespace: ns.name, text: item.text, blobId: item.blobId, writtenAt: item.writtenAt })) restored++;
        const event = decodeEnvelope(item.text)?.event;
        if (typeof event?.h === 'string') {
          await db.insert(outbox).values({ userId, namespace: ns.name, text: item.text, idempotencyKey: event.h, status: 'stored', blobId: item.blobId }).onConflictDoNothing();
        }
        if (typeof event?.gm === 'string') {
          await db.insert(seenMessages).values({ userId, messageHash: event.gm }).onConflictDoNothing();
        }
      }
    }

    const next = cursor + batch.length;
    return NextResponse.json({ restored, cursor: next, total: all.length, done: next >= all.length });
  } catch (error) {
    if (error instanceof RebuildIncompleteError) return NextResponse.json({ error: error.message.replace(userId, 'you') }, { status: 502 });
    console.error('rebuild failed:', (error as Error).name);
    return NextResponse.json({ error: 'Walrus Memory could not be reached. Your memories are safe: try again.' }, { status: 502 });
  }
}
