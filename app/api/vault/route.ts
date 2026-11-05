import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDb } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, namespaces } from '@/lib/memory/namespaces';
import { enqueue } from '@/lib/memory/store';

const Body = z.object({ address: z.string().trim().regex(/^0x[0-9a-fA-F]{64}$/) });

/** Kyvo only reads the vault. It never holds keys and can't move money. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A Sui address starts with 0x, then 64 letters and numbers' }, { status: 400 });

  const address = parsed.data.address.toLowerCase();
  const { userId } = session;
  const db = createDb();
  await db.update(users).set({ vaultAddress: address }).where(eq(users.id, userId));

  const h = eventKey({ userId, type: 'vault', merchant: address });
  await enqueue(db, [{ userId, namespace: namespaces.profile(userId), idempotencyKey: h, text: encodeEnvelope(`The dollar vault is the Sui address ${address}.`, { v: 1, t: 'vault', address, d: today(), src: 'user', h }) }]);
  return NextResponse.json({ ok: true });
}
