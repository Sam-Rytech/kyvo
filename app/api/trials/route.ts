import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDb } from '@/db';
import { getSession } from '@/lib/auth/session';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, merchantSlug, namespaces } from '@/lib/memory/namespaces';
import { enqueue } from '@/lib/memory/store';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z.object({ name: z.string().trim().min(1).max(80), startedOn: isoDate, endsAt: isoDate });

/** The user confirms a date the emails didn't state. Memory is append-only, so this is a newer event. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid date' }, { status: 400 });
  const { name, startedOn, endsAt } = parsed.data;
  const { userId } = session;

  const m = merchantSlug(name);
  const h = eventKey({ userId, type: 'trial_start', merchant: m, date: endsAt });
  await enqueue(createDb(), [
    {
      userId,
      namespace: namespaces.trials(userId),
      idempotencyKey: h,
      text: encodeEnvelope(`${name} trial started ${startedOn} and ends ${endsAt}, as confirmed by the user.`, { v: 1, t: 'trial_start', m, name, d: startedOn, endsAt, src: 'user', h }),
    },
  ]);
  return NextResponse.json({ ok: true });
}
