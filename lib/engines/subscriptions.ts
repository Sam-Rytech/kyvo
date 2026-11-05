// Current state derived only from cached events, so it comes out the same after
// a Total Recall. Forecasting is built on top of this on Day 3.
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
  records: SubscriptionRecord[];
};

const SUBSCRIPTION_TYPES = new Set(['charge', 'usage_bill', 'decline', 'refund', 'price_change', 'card_added']);
const PAID_TYPES = new Set(['charge', 'usage_bill']);

const titleCase = (slug: string) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const num = (value: unknown) => (typeof value === 'number' ? value : null);
const str = (value: unknown) => (typeof value === 'string' ? value : null);

export function deriveSubscriptions(events: CachedEvent[]): SubscriptionView[] {
  const groups = new Map<string, CachedEvent[]>();
  for (const event of events) {
    if (!event.merchant || !SUBSCRIPTION_TYPES.has(event.type)) continue;
    groups.set(event.merchant, [...(groups.get(event.merchant) ?? []), event]);
  }

  const views = [...groups.entries()].map(([slug, list]): SubscriptionView => {
    // Oldest first. A blob ID breaks ties, so a rebuild gives the same order.
    const sorted = [...list].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '') || a.blobId.localeCompare(b.blobId));
    const paid = sorted.filter((e) => PAID_TYPES.has(e.type) && num(e.event.amt) !== null);
    const last = paid.at(-1);
    const previous = paid.at(-2);
    const lastAmount = last ? num(last.event.amt) : null;
    const previousAmount = previous ? num(previous.event.amt) : null;

    return {
      slug,
      name: str(sorted.find((e) => str(e.event.name))?.event.name) ?? titleCase(slug),
      lastAmount,
      currency: last ? str(last.event.cur) : null,
      lastDate: last?.eventDate ?? null,
      card: str([...sorted].reverse().find((e) => str(e.event.card))?.event.card),
      chargeCount: paid.length,
      declineCount: sorted.filter((e) => e.type === 'decline').length,
      refundCount: sorted.filter((e) => e.type === 'refund').length,
      usageBilled: sorted.some((e) => e.type === 'usage_bill'),
      priceChange: lastAmount !== null && previousAmount !== null && lastAmount !== previousAmount ? { from: previousAmount, to: lastAmount } : null,
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
