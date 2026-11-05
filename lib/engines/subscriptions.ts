// Current state derived only from cached events, so it comes out the same after a Total Recall.
import { VAT_RATES } from '@/config/providers';

export type CachedEvent = {
  type: string;
  merchant: string | null;
  eventDate: string | null;
  blobId: string;
  sentence: string;
  event: Record<string, unknown>;
};

export type SubscriptionRecord = { type: string; date: string | null; amount: number | null; currency: string | null; sentence: string; blobId: string };

export type SubscriptionView = {
  slug: string;
  name: string;
  lastAmount: number | null;
  currency: string | null;
  lastDate: string | null;
  card: string | null;
  chargeCount: number;
  declineCount: number;
  refundCount: number;
  usageBilled: boolean;
  priceChange: { from: number; to: number } | null;
  /** The bill rose, but only because tax was added */
  taxRise: { from: number; to: number } | null;
  records: SubscriptionRecord[];
};

const SUBSCRIPTION_TYPES = new Set(['charge', 'usage_bill', 'decline', 'refund', 'price_change', 'card_added']);
const PAID_TYPES = new Set(['charge', 'usage_bill']);
const RISE_THRESHOLD = 1.02;
const VAT_TOLERANCE = 0.005;

const titleCase = (slug: string) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const num = (value: unknown) => (typeof value === 'number' ? value : null);
const str = (value: unknown) => (typeof value === 'string' ? value : null);

/** Memories can't be deleted, so a merchant billed only in the user's own currency is hidden here. */
export function isForeignBilled(list: CachedEvent[], homeCurrency: string | undefined): boolean {
  if (!homeCurrency || homeCurrency === 'USD') return true;
  return list.some((e) => {
    const currency = str(e.event.cur);
    return currency !== null && currency !== homeCurrency;
  });
}

/**
 * A hike is a rise of over 2% on a fixed-price bill (§7.4). Usage bills vary by nature. A rise
 * that's only tax isn't a price rise: subtotals settle it when the email showed them, and
 * otherwise a rise matching a known VAT rate is read as tax.
 */
function compareBills(last: CachedEvent | undefined, previous: CachedEvent | undefined, usageBilled: boolean, homeCurrency: string | undefined): Pick<SubscriptionView, 'priceChange' | 'taxRise'> {
  const none = { priceChange: null, taxRise: null };
  const to = last ? num(last.event.amt) : null;
  const from = previous ? num(previous.event.amt) : null;
  if (usageBilled || to === null || from === null || to <= from * RISE_THRESHOLD) return none;

  const toSubtotal = num(last?.event.subtotal);
  const fromSubtotal = num(previous?.event.subtotal);
  if (toSubtotal !== null && fromSubtotal !== null) {
    return toSubtotal > fromSubtotal * RISE_THRESHOLD ? { priceChange: { from: fromSubtotal, to: toSubtotal }, taxRise: null } : { priceChange: null, taxRise: { from, to } };
  }

  const vat = homeCurrency ? VAT_RATES[homeCurrency] : undefined;
  if (vat !== undefined && Math.abs(to - from * (1 + vat)) <= from * VAT_TOLERANCE) return { priceChange: null, taxRise: { from, to } };
  return { priceChange: { from, to }, taxRise: null };
}

export function deriveSubscriptions(events: CachedEvent[], homeCurrency?: string): SubscriptionView[] {
  const groups = new Map<string, CachedEvent[]>();
  for (const event of events) {
    if (!event.merchant || !SUBSCRIPTION_TYPES.has(event.type)) continue;
    groups.set(event.merchant, [...(groups.get(event.merchant) ?? []), event]);
  }

  const kept = [...groups.entries()].filter(([, list]) => isForeignBilled(list, homeCurrency));

  const views = kept.map(([slug, list]): SubscriptionView => {
    // Oldest first. A blob ID breaks ties, so a rebuild gives the same order.
    const sorted = [...list].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '') || a.blobId.localeCompare(b.blobId));
    // A receipt and an invoice can describe the same money, so one day and amount counts once.
    const paid = [...new Map(sorted.filter((e) => PAID_TYPES.has(e.type) && num(e.event.amt) !== null).map((e) => [`${e.eventDate}|${num(e.event.amt)}`, e])).values()];
    const last = paid.at(-1);
    const previous = paid.at(-2);
    const lastAmount = last ? num(last.event.amt) : null;
    const previousAmount = previous ? num(previous.event.amt) : null;
    const usageBilled = sorted.some((e) => e.type === 'usage_bill');

    return {
      slug,
      name: str(sorted.find((e) => str(e.event.name))?.event.name) ?? titleCase(slug),
      lastAmount,
      currency: last ? str(last.event.cur) : null,
      lastDate: last?.eventDate ?? null,
      card: str([...sorted].reverse().find((e) => str(e.event.card))?.event.card),
      chargeCount: paid.length,
      // Several emails can describe one failed attempt, so a day counts once.
      declineCount: new Set(sorted.filter((e) => e.type === 'decline').map((e) => e.eventDate)).size,
      refundCount: sorted.filter((e) => e.type === 'refund').length,
      usageBilled,
      ...compareBills(last, previous, usageBilled, homeCurrency),
      records: [...sorted].reverse().map((e) => ({
        type: e.type,
        date: e.eventDate,
        amount: num(e.event.amt),
        currency: str(e.event.cur),
        sentence: e.sentence,
        blobId: e.blobId,
      })),
    };
  });

  return views.sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || a.slug.localeCompare(b.slug));
}
