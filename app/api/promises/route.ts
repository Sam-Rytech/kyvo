import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDb } from '@/db';
import { getSession } from '@/lib/auth/session';
import { addPromise, resolvePromise } from '@/lib/memory/promises';

const Body = z.union([z.object({ id: z.string().min(1).max(200), text: z.string().max(200), done: z.literal(true) }), z.object({ text: z.string().trim().min(3).max(200) })]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Write what you plan to do' }, { status: 400 });

  const db = createDb();
  if ('done' in parsed.data) await resolvePromise(db, session.userId, parsed.data.id, parsed.data.text);
  else await addPromise(db, session.userId, parsed.data.text);
  return NextResponse.json({ ok: true });
}
