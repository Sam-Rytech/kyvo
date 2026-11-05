// What's due, how much and when (architecture §7.1). The memory-less comparison lives here too,
// because the two only mean something side by side.
import { getProviderRule, transactionFee } from '@/config/providers';
import { addDays, diffDays, medianOf, nextMonthlyDate, roundCents } from './dates';
import { merchantHistories, type Basis, type MerchantHistory } from './history';
import { cardStates } from './registry';
import type { CachedEvent } from './subscriptions';

const FALLBACK_INTERVAL_DAYS = 30;
/** A charge this overdue has stopped, rather than being late. */
const GRACE_DAYS = 10;
const FUND_WINDOW_DAYS = 30;
const FUND_LEAD_DAYS = 2;
const USAGE_VARIANCE = 0.2;
const KNOWN_USAGE_BILLED = new Set(['aws', 'amazon-web-services', 'openai-api', 'twilio']);

export type MerchantForecast = {
  slug: string;
  name: string;
  nextDate: string;
  amount: number;
  intervalDays: number;
  usage: boolean;
  confidence: 'high' | 'medium' | 'low';
  card: string | null;
  basis: Basis[];
};

/**
 * Only what was known on `asOf` counts, so replaying history can't cheat.
 * Returns null when a merchant has no live rhythm: never charged, refunded, or long overdue.
 */
export function forecastMerchant(history: MerchantHistory, asOf: string): MerchantForecast | null {
  const paid = history.charges.filter((c) => !c.refunded && c.date < asOf);
  const last = paid.at(-1);
  if (!last) return null;

  const gaps = paid.slice(1).map((charge, i) => diffDays(charge.date, paid[i].date));
  const intervalDays = gaps.length ? Math.round(medianOf(gaps)) : FALLBACK_INTERVAL_DAYS;
  const nextDate = addDays(last.date, intervalDays);
  if (diffDays(asOf, nextDate) > GRACE_DAYS) return null;

  const amounts = paid.map((c) => c.amount);
  const varies = amounts.slice(1).some((amount, i) => Math.abs(amount - amounts[i]) / amounts[i] > USAGE_VARIANCE);
  const usage = paid.some((c) => c.usage) || varies || KNOWN_USAGE_BILLED.has(history.slug);

  const announced = history.priceChanges.filter((change) => change.date > last.date && change.date < asOf).at(-1);
  const amount = announced && !usage ? announced.to : usage ? medianOf(amounts.slice(-3)) : last.amount;

  return {
    slug: history.slug,
    name: history.name,
    nextDate,
    amount: roundCents(amount),
    intervalDays,
    usage,
    confidence: paid.length >= 3 ? 'high' : paid.length === 2 ? 'medium' : 'low',
    card: last.card ?? history.card,
    basis: [...paid.map((c) => c.basis), ...(announced ? [announced.basis] : [])],
  };
}

export type BlankForecast = { slug: string; name: string; nextDate: string; amount: number };

/**
 * What a forecast with no memory says. Without history it can only assume the first price it
 * ever saw repeats monthly, forever: no fees, no refunds, nothing ever cancelled.
 */
export function blankForecasts(histories: Map<string, MerchantHistory>, asOf: string): BlankForecast[] {
  return [...histories.values()]
    .flatMap((history) => {
      const first = history.charges[0];
      return first ? [{ slug: history.slug, name: history.name, nextDate: nextMonthlyDate(first.date, asOf), amount: first.amount }] : [];
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.slug.localeCompare(b.slug));
}

export type FundingItem = MerchantForecast & { fee: number | null; provider: string | null };

export type Funding = {
  items: FundingItem[];
  chargesTotal: number;
  feesTotal: number;
  buffer: number;
  knownBalance: number;
  total: number;
  fundBy: string | null;
  /** Merchants whose card has no confirmed fee, so none was added */
  unknownFees: string[];
  /** Cards with no entered balance, so nothing was subtracted */
  unknownBalanceCards: string[];
};

/** Charges + fees + a 5% buffer (at least $1) − what's known to be on the cards. */
export function buildFunding(events: CachedEvent[], homeCurrency: string | undefined, asOf: string): Funding {
  const histories = merchantHistories(events, homeCurrency);
  const cards = cardStates(events, asOf);
  const horizon = addDays(asOf, FUND_WINDOW_DAYS);

  const items: FundingItem[] = [...histories.values()]
    .flatMap((history) => {
      const forecast = forecastMerchant(history, asOf);
      if (!forecast || forecast.nextDate > horizon) return [];
      const provider = cards.find((c) => c.card === forecast.card)?.provider ?? null;
      return [{ ...forecast, provider, fee: transactionFee(getProviderRule(provider), forecast.amount) }];
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  const chargesTotal = roundCents(items.reduce((sum, item) => sum + item.amount, 0));
  const feesTotal = roundCents(items.reduce((sum, item) => sum + (item.fee ?? 0), 0));
  const subtotal = chargesTotal + feesTotal;
  // 5% in whole cents, rounded up, worked out in integers to avoid floating-point surprises.
  const buffer = items.length ? Math.max(1, Math.ceil(Math.round(subtotal * 100) / 20) / 100) : 0;

  const usedCards = [...new Set(items.map((item) => item.card).filter((card): card is string => Boolean(card)))];
  const balances = usedCards.map((card) => ({ card, balance: cards.find((c) => c.card === card)?.balance ?? null }));
  const knownBalance = roundCents(balances.reduce((sum, b) => sum + (b.balance ?? 0), 0));

  const earliest = items[0]?.nextDate ?? null;
  const fundBy = earliest ? (addDays(earliest, -FUND_LEAD_DAYS) > asOf ? addDays(earliest, -FUND_LEAD_DAYS) : asOf) : null;

  return {
    items,
    chargesTotal,
    feesTotal,
    buffer,
    knownBalance,
    total: roundCents(Math.max(0, subtotal + buffer - knownBalance)),
    fundBy,
    unknownFees: items.filter((item) => item.fee === null).map((item) => item.slug),
    unknownBalanceCards: balances.filter((b) => b.balance === null).map((b) => b.card),
  };
}
