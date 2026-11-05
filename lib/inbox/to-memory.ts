import { encodeEnvelope, type EventType, type MemoryEvent } from '@/lib/memory/envelope';
import { eventKey, merchantSlug, namespaces, sha256 } from '@/lib/memory/namespaces';
import type { ExtractedEvent } from './extractor';

export type OutboxItem = { userId: string; namespace: string; text: string; idempotencyKey: string };

const money = (amount: number | undefined, currency: string | undefined) => (amount === undefined ? 'an unstated amount' : `${currency ?? 'USD'} ${amount.toFixed(2)}`);

function describe(e: ExtractedEvent): { type: EventType; sentence: string; fields: Record<string, unknown>; merchant?: string; amount?: number } {
  const card = 'cardHint' in e && e.cardHint ? ` on the card ending ${e.cardHint}` : '';
  switch (e.kind) {
    case 'charge':
      return { type: 'charge', merchant: e.merchant, amount: e.amount, sentence: `${e.merchant} charged ${money(e.amount, e.currency)} on ${e.date}${card}.`, fields: { amt: e.amount, subtotal: e.subtotal, cur: e.currency, card: e.cardHint } };
    case 'usage_bill':
      return { type: 'usage_bill', merchant: e.merchant, amount: e.amount, sentence: `${e.merchant} billed ${money(e.amount, e.currency)} for usage on ${e.date}${card}.`, fields: { amt: e.amount, cur: e.currency, period: e.period, card: e.cardHint } };
    case 'decline':
      return { type: 'decline', merchant: e.merchant, amount: e.amount, sentence: `${e.merchant} failed to charge ${money(e.amount, e.currency)} on ${e.date}${card}.`, fields: { amt: e.amount, cur: e.currency, reason: e.reason, card: e.cardHint } };
    case 'refund':
      return { type: 'refund', merchant: e.merchant, amount: e.amount, sentence: `${e.merchant} refunded ${money(e.amount, e.currency)} on ${e.date}${card}.`, fields: { amt: e.amount, cur: e.currency, card: e.cardHint } };
    case 'card_added':
      return { type: 'card_added', merchant: e.merchant, sentence: `${e.merchant} saved a card on ${e.date}${card}.`, fields: { card: e.cardHint } };
    case 'price_change':
      return { type: 'price_change', merchant: e.merchant, amount: e.to, sentence: `${e.merchant} changed its price${e.from ? ` from ${money(e.from, e.currency)}` : ''} to ${money(e.to, e.currency)}${e.effective ? `, effective ${e.effective}` : ''}.`, fields: { from: e.from, to: e.to, cur: e.currency, effective: e.effective } };
    case 'trial_start':
      return { type: 'trial_start', merchant: e.merchant, sentence: `${e.merchant} trial started ${e.date}${e.endsAt ? `, ending ${e.endsAt}` : ''}${e.convertsTo ? `, then ${money(e.convertsTo, e.currency)}` : ''}.`, fields: { endsAt: e.endsAt, convertsTo: e.convertsTo, cur: e.currency } };
    case 'card_topup':
      return { type: 'card_topup', amount: e.amount, sentence: `The ${e.provider} card was funded with ${money(e.amount, e.currency)} on ${e.date}.`, fields: { provider: e.provider, amt: e.amount, cur: e.currency } };
  }
}

function namespaceFor(userId: string, e: ExtractedEvent): string {
  if (e.kind === 'trial_start') return namespaces.trials(userId);
  if (e.kind === 'card_topup') return namespaces.cards(userId);
  return namespaces.merchant(userId, e.merchant);
}

/** The hashed message ID travels with the memory, so a rebuild can restore the dedupe list. */
export function eventToOutbox(userId: string, e: ExtractedEvent, messageId: string): OutboxItem {
  const { type, sentence, fields, merchant, amount } = describe(e);
  const m = merchant ? merchantSlug(merchant) : undefined;
  const h = eventKey({ userId, type, merchant: m ?? ('provider' in e ? e.provider : ''), date: e.date, amount });
  const event: MemoryEvent = { v: 1, t: type, m, name: merchant, d: e.date, src: 'gmail', gm: sha256(messageId), h, ...fields };
  return { userId, namespace: namespaceFor(userId, e), text: encodeEnvelope(sentence, event), idempotencyKey: h };
}
