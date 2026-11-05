import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDb } from '@/db';
import { cacheEvents } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, namespaces, sha256 } from '@/lib/memory/namespaces';
import { enqueue } from '@/lib/memory/store';

const Body = z.union([z.object({ text: z.string().trim().min(3).max(200) }), z.object({ id: z.string().min(1).max(200), text: z.string().max(200), done: z.literal(true) })]);

/** "Cancel Canva" becomes a promise. Marking it done is a newer event with the same ID. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Write what you plan to do' }, { status: 400 });
  const { userId } = session;
  const db = createDb();
  const d = today();
  const namespace = namespaces.promises(userId);

  if ('done' in parsed.data) {
    const { id, text } = parsed.data;
    const h = eventKey({ userId, type: 'promise:done', merchant: id });
    await enqueue(db, [{ userId, namespace, idempotencyKey: h, text: encodeEnvelope(`On ${d} the user kept this promise: "${text}".`, { v: 1, t: 'promise', pid: id, text, status: 'done', d, src: 'user', h }) }]);
    return NextResponse.json({ ok: true });
  }

  const { text } = parsed.data;
  const known = await db.select({ merchant: cacheEvents.merchant, event: cacheEvents.event }).from(cacheEvents).where(eq(cacheEvents.userId, userId));
  const lower = text.toLowerCase();
  const match = known.find((row) => typeof row.event.name === 'string' && row.merchant && lower.includes(row.event.name.toLowerCase()));

  const pid = sha256(`${userId}|${text}`).slice(0, 16);
  const h = eventKey({ userId, type: 'promise', merchant: pid, date: d });
  await enqueue(db, [
    {
      userId,
      namespace,
      idempotencyKey: h,
      text: encodeEnvelope(`On ${d} the user said: "${text.replace(/#ky/g, 'ky')}".`, { v: 1, t: 'promise', pid, m: match?.merchant ?? undefined, text, status: 'open', d, src: 'user', h }),
    },
  ]);
  return NextResponse.json({ ok: true });
}
