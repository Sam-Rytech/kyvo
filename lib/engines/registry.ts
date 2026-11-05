// Who holds each card (architecture §7.4), built up from what the inbox shows.
import { diffDays, roundCents } from './dates';
import type { CachedEvent } from './subscriptions';

const STALE_AFTER_DAYS = 60;
const HOLDING_TYPES = new Set(['charge', 'usage_bill', 'decline', 'card_added', 'refund']);
const PAID_TYPES = new Set(['charge', 'usage_bill']);

const str = (value: unknown) => (typeof value === 'string' ? value : null);
const num = (value: unknown) => (typeof value === 'number' ? value : null);

export type CardHolder = { slug: string; name: string; lastSeen: string; stale: boolean; blobIds: string[] };

export type CardState = {
  card: string;
  provider: string | null;
  /** null means unknown, which is never the same as zero */
  balance: number | null;
  holders: CardHolder[];
};

function balanceOf(card: string, events: CachedEvent[]): number | null {
  const mine = events.filter((e) => str(e.event.card) === card && e.eventDate);
  const anchor = mine.filter((e) => e.type === 'card_balance' && num(e.event.amt) !== null).sort((a, b) => (a.eventDate as string).localeCompare(b.eventDate as string) || a.blobId.localeCompare(b.blobId)).at(-1);
  if (!anchor) return null;

  // One day and amount counts once, as in the merchant history.
  const seen = new Set<string>();
  let balance = num(anchor.event.amt) as number;
  for (const e of mine) {
    const amount = num(e.event.amt);
    if (amount === null || (e.eventDate as string) <= (anchor.eventDate as string)) continue;
    if (e.type === 'card_topup' || e.type === 'refund') balance += amount;
    if (PAID_TYPES.has(e.type)) {
      const key = `${e.merchant}|${e.eventDate}|${amount}`;
      if (!seen.has(key)) balance -= amount;
      seen.add(key);
    }
  }
  return roundCents(balance);
}

export function cardStates(events: CachedEvent[], asOf: string): CardState[] {
  const cards = new Set<string>();
  for (const e of events) {
    const card = str(e.event.card);
    if (card && (HOLDING_TYPES.has(e.type) || e.type === 'card_balance' || e.type === 'card_removed')) cards.add(card);
  }

  return [...cards].sort().map((card) => {
    const mine = events.filter((e) => str(e.event.card) === card).sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '') || a.blobId.localeCompare(b.blobId));

    const holders = new Map<string, CardHolder>();
    for (const e of mine) {
      if (!e.merchant) continue;
      if (e.type === 'card_removed') {
        holders.delete(e.merchant);
        continue;
      }
      if (!HOLDING_TYPES.has(e.type) || !e.eventDate) continue;
      holders.set(e.merchant, {
        slug: e.merchant,
        name: str(e.event.name) ?? holders.get(e.merchant)?.name ?? e.merchant,
        lastSeen: e.eventDate,
        stale: diffDays(asOf, e.eventDate) > STALE_AFTER_DAYS,
        blobIds: [...(holders.get(e.merchant)?.blobIds ?? []), e.blobId],
      });
    }

    const named = mine.filter((e) => !e.merchant && str(e.event.provider)).at(-1);
    return {
      card,
      provider: named ? str(named.event.provider) : null,
      balance: balanceOf(card, events),
      holders: [...holders.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.slug.localeCompare(b.slug)),
    };
  });
}
