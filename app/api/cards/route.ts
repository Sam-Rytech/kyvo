import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDb } from '@/db';
import { getSession } from '@/lib/auth/session';
import { today } from '@/lib/engines/dates';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { eventKey, namespaces } from '@/lib/memory/namespaces';
import { enqueue } from '@/lib/memory/store';

const Body = z.object({
  card: z.string().trim().regex(/^[\w .-]{1,40}$/),
  merchant: z.string().trim().min(1).max(80).optional(),
  merchantName: z.string().trim().max(80).optional(),
  provider: z.string().trim().min(1).max(40).optional(),
  balance: z.number().min(0).max(1_000_000).optional(),
  removeHolder: z.boolean().optional(),
});

/** What card providers can't tell Kyvo: who issued a card, what's on it, and who was removed from it. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the card details and try again' }, { status: 400 });
  const { card, provider, balance, merchant, merchantName, removeHolder } = parsed.data;
  const { userId } = session;
  const namespace = namespaces.cards(userId);
  const d = today();

  const items = [];
  if (provider) {
    const h = eventKey({ userId, type: 'card_added', merchant: `${card}:${provider}` });
    items.push({ userId, namespace, idempotencyKey: h, text: encodeEnvelope(`Card "${card}" is a ${provider} card.`, { v: 1, t: 'card_added', card, provider, d, src: 'user', h }) });
  }
  if (balance !== undefined) {
    const h = eventKey({ userId, type: 'card_balance', merchant: card, date: d, amount: balance });
    items.push({ userId, namespace, idempotencyKey: h, text: encodeEnvelope(`Card "${card}" held USD ${balance.toFixed(2)} on ${d}, as entered by the user.`, { v: 1, t: 'card_balance', card, amt: balance, cur: 'USD', d, src: 'user', h }) });
  }
  if (removeHolder && merchant) {
    const h = eventKey({ userId, type: 'card_removed', merchant: `${card}:${merchant}`, date: d });
    items.push({
      userId,
      namespace: namespaces.merchant(userId, merchant),
      idempotencyKey: h,
      text: encodeEnvelope(`The user removed card "${card}" from ${merchantName ?? merchant} on ${d}.`, { v: 1, t: 'card_removed', m: merchant, name: merchantName, card, d, src: 'user', h }),
    });
  }
  if (items.length === 0) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 });

  await enqueue(createDb(), items);
  return NextResponse.json({ ok: true });
}
