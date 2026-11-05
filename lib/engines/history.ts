// Turns raw events into each merchant's billing history. Everything downstream reads this,
// so a charge described by two emails or later refunded is only handled here.
import { diffDays } from './dates';
import { isForeignBilled, type CachedEvent } from './subscriptions';

export type Basis = { blobId: string; sentence: string; date: string; amount: number | null };

export type PaidCharge = {
  date: string;
  amount: number;
  usage: boolean;
  refunded: boolean;
  card: string | null;
  basis: Basis;
};

export type MerchantHistory = {
  slug: string;
  name: string;
  charges: PaidCharge[];
  declines: { date: string; amount: number | null; card: string | null; basis: Basis }[];
  priceChanges: { date: string; to: number; basis: Basis }[];
  card: string | null;
};

const REFUND_WINDOW_DAYS = 30;

const num = (value: unknown) => (typeof value === 'number' ? value : null);
const str = (value: unknown) => (typeof value === 'string' ? value : null);
const titleCase = (slug: string) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const basisOf = (e: CachedEvent): Basis => ({ blobId: e.blobId, sentence: e.sentence, date: e.eventDate ?? '', amount: num(e.event.amt) });

export function merchantHistories(events: CachedEvent[], homeCurrency?: string): Map<string, MerchantHistory> {
  const groups = new Map<string, CachedEvent[]>();
  for (const event of events) {
    if (event.merchant) groups.set(event.merchant, [...(groups.get(event.merchant) ?? []), event]);
  }

  const histories = new Map<string, MerchantHistory>();
  // Sorted, so results never depend on the order events arrive in, as after a Total Recall.
  for (const [slug, list] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!isForeignBilled(list, homeCurrency)) continue;
    const sorted = [...list].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '') || a.blobId.localeCompare(b.blobId));

    // One day and amount counts once, because a receipt and an invoice describe the same money.
    const charges = new Map<string, PaidCharge>();
    for (const e of sorted) {
      const amount = num(e.event.amt);
      if ((e.type !== 'charge' && e.type !== 'usage_bill') || amount === null || !e.eventDate) continue;
      const key = `${e.eventDate}|${amount}`;
      const existing = charges.get(key);
      charges.set(key, {
        date: e.eventDate,
        amount,
        usage: (existing?.usage ?? false) || e.type === 'usage_bill',
        refunded: false,
        card: existing?.card ?? str(e.event.card),
        basis: existing?.basis ?? basisOf(e),
      });
    }

    // A refund cancels one charge of the same amount, not a smaller or larger one.
    const chargeList = [...charges.values()];
    for (const e of sorted) {
      const amount = num(e.event.amt);
      if (e.type !== 'refund' || amount === null || !e.eventDate) continue;
      const match = chargeList.find((c) => !c.refunded && Math.abs(c.amount - amount) < 0.01 && e.eventDate! >= c.date && diffDays(e.eventDate!, c.date) <= REFUND_WINDOW_DAYS);
      if (match) match.refunded = true;
    }

    histories.set(slug, {
      slug,
      name: str(sorted.find((e) => str(e.event.name))?.event.name) ?? titleCase(slug),
      charges: chargeList,
      declines: sorted.filter((e) => e.type === 'decline' && e.eventDate).map((e) => ({ date: e.eventDate as string, amount: num(e.event.amt), card: str(e.event.card), basis: basisOf(e) })),
      priceChanges: sorted.flatMap((e) => {
        const to = num(e.event.to);
        return e.type === 'price_change' && e.eventDate && to !== null ? [{ date: e.eventDate, to, basis: basisOf(e) }] : [];
      }),
      card: str([...sorted].reverse().find((e) => str(e.event.card))?.event.card),
    });
  }
  return histories;
}
