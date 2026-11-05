// Warns before a charge can fail (architecture §7.2), from what this user's own history shows
// and the rules their provider has really published. An unpublished rule stays unstated.
import { fundingMarkup, getProviderRule, transactionFee } from '@/config/providers';
import { diffDays, roundCents } from './dates';
import { forecastMerchant } from './forecast';
import { merchantHistories } from './history';
import { cardStates } from './registry';
import type { CachedEvent } from './subscriptions';

const LOOKBACK_CHARGES = 3;
const URGENT_DAYS = 2;
const HORIZON_DAYS = 30;

export type GuardAlert = {
  slug: string;
  name: string;
  nextDate: string;
  hoursAway: number;
  amount: number;
  card: string | null;
  provider: string | null;
  markup: number;
  level: 'info' | 'watch' | 'danger';
  /** Distinct days a payment failed across the recent billing cycles */
  declinesRecent: number;
  chargesRecent: number;
  consecutiveDeclines: number;
  shortfall: number | null;
  message: string;
  /** The provider's rule, only when it has published one */
  rule: string | null;
  declineFee: { amount: number; currency: string } | null;
  basis: { blobId: string; sentence: string }[];
};

export function guardAlerts(events: CachedEvent[], homeCurrency: string | undefined, asOf: string): GuardAlert[] {
  const cards = cardStates(events, asOf);
  const alerts: GuardAlert[] = [];

  for (const history of merchantHistories(events, homeCurrency).values()) {
    const forecast = forecastMerchant(history, asOf);
    if (!forecast) continue;
    const daysAway = diffDays(forecast.nextDate, asOf);
    if (daysAway > HORIZON_DAYS) continue;

    const paid = history.charges.filter((c) => !c.refunded && c.date < asOf);
    const recent = paid.slice(-LOOKBACK_CHARGES);
    const since = recent[0]?.date ?? '';
    const recentDeclines = history.declines.filter((d) => d.date >= since && d.date < asOf);
    const declinesRecent = new Set(recentDeclines.map((d) => d.date)).size;

    // Providers count declines in a row, so a success on the same day clears it.
    const lastPaid = paid.at(-1)?.date ?? '';
    const consecutiveDeclines = new Set(history.declines.filter((d) => d.date > lastPaid && d.date < asOf).map((d) => d.date)).size;

    const state = cards.find((c) => c.card === forecast.card);
    const provider = state?.provider ?? null;
    const rule = getProviderRule(provider);
    const fee = transactionFee(rule, forecast.amount) ?? 0;
    const balance = state?.balance ?? null;
    const shortfall = balance !== null && balance < forecast.amount + fee ? roundCents(forecast.amount + fee - balance) : null;

    const limit = rule?.termination?.consecutiveDeclines ?? null;
    const atRisk = limit !== null && consecutiveDeclines >= limit - 1 && consecutiveDeclines > 0;
    let ruleText: string | null = rule?.termination?.note ?? null;
    if (limit !== null && consecutiveDeclines > 0) {
      ruleText = `${consecutiveDeclines} ${consecutiveDeclines === 1 ? 'decline' : 'declines'} in a row so far on ${provider}, and its rule is about ${limit}. ${rule?.termination?.note}`;
    }

    const urgent = daysAway <= URGENT_DAYS;
    const level: GuardAlert['level'] = (urgent && shortfall !== null) || atRisk ? 'danger' : declinesRecent > 0 || shortfall !== null ? 'watch' : 'info';
    if (level === 'info' && !urgent) continue;

    const parts: string[] = [];
    if (declinesRecent > 0) parts.push(`This charge failed ${declinesRecent} of the last ${recent.length} times.`);
    if (shortfall !== null) parts.push(`Your card looks $${shortfall.toFixed(2)} short.`);
    if (urgent && balance === null) parts.push("It's due soon, and Kyvo doesn't know your card's balance.");

    alerts.push({
      slug: history.slug,
      name: history.name,
      nextDate: forecast.nextDate,
      hoursAway: daysAway * 24,
      amount: forecast.amount,
      card: forecast.card,
      provider,
      markup: fundingMarkup(provider),
      level,
      declinesRecent,
      chargesRecent: recent.length,
      consecutiveDeclines,
      shortfall,
      message: parts.join(' ') || `Due in ${daysAway} days.`,
      rule: ruleText,
      declineFee: rule?.declineFee ?? null,
      basis: recentDeclines.map((d) => ({ blobId: d.basis.blobId, sentence: d.basis.sentence })),
    });
  }
  return alerts.sort((a, b) => a.hoursAway - b.hoursAway);
}
