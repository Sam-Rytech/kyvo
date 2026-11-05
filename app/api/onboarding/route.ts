import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CURRENCIES } from '@/config/providers';
import { createDb } from '@/db';
import { users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, namespaces } from '@/lib/memory/namespaces';
import { enqueue } from '@/lib/memory/store';

const Body = z.object({
  homeCurrency: z.enum(CURRENCIES),
  providers: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a currency and at least one card provider' }, { status: 400 });
  const { homeCurrency, providers } = parsed.data;

  const db = createDb();
  await db.update(users).set({ homeCurrency, providers }).where(eq(users.id, session.userId));

  // A changed profile is a new memory: the newest one wins (architecture §6.2).
  const h = eventKey({ userId: session.userId, type: 'profile', merchant: `${homeCurrency}:${[...providers].sort().join(',')}` });
  await enqueue(db, [
    {
      userId: session.userId,
      namespace: namespaces.profile(session.userId),
      idempotencyKey: h,
      text: encodeEnvelope(`Home currency is ${homeCurrency}; dollar subscriptions are paid with ${providers.join(' and ')}.`, {
        v: 1,
        t: 'profile',
        homeCurrency,
        providers,
        src: 'user',
        h,
      }),
    },
  ]);

  return NextResponse.json({ ok: true });
}
