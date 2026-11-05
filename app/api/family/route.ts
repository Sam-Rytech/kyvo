import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDb } from '@/db';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { planMemory } from '@/lib/engines/family';
import { enqueue } from '@/lib/memory/store';

const Body = z.object({
  merchant: z.string().trim().min(1).max(60),
  firstDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  members: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        address: z.string().trim().regex(/^0x[0-9a-fA-F]{64}$/),
        // Gasless USDC transfers below 0.01 have failed on Sui (architecture §13).
        share: z.number().min(0.01).max(100_000),
      }),
    )
    .min(1)
    .max(12),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check each member has a name, a full Sui address, and a share of at least $0.01' }, { status: 400 });

  const addresses = parsed.data.members.map((m) => m.address.toLowerCase());
  if (new Set(addresses).size !== addresses.length) return NextResponse.json({ error: 'Each member needs their own Sui address, or payments can\'t be told apart' }, { status: 400 });

  await enqueue(createDb(), [planMemory(session.userId, parsed.data, today())]);
  return NextResponse.json({ ok: true });
}
