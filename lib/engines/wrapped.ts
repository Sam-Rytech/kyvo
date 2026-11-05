// Dollar Wrapped: a month in review. Its headline is how close the forecast came (architecture §2).
import { monthOf, roundCents } from './dates';
import { buildHindcast } from './hindcast';
import { merchantHistories } from './history';
import type { CachedEvent } from './subscriptions';

export type WrappedReport = {
  month: string;
  src: 'hindcast';
  /** 0 to 100. Null when nothing was spent, so there was nothing to be accurate about. */
  accuracy: number | null;
  memoryError: number;
  blankError: number;
  spent: number;
  refunded: number;
  declines: number;
  top: { name: string; amount: number }[];
};

export function wrappedMonths(events: CachedEvent[], homeCurrency: string | undefined, asOf: string): string[] {
  const months = new Set<string>();
  for (const history of merchantHistories(events, homeCurrency).values()) {
    for (const charge of history.charges) months.add(monthOf(charge.date));
  }
  return [...months].filter((month) => month < monthOf(asOf)).sort().reverse();
}

export function buildWrapped(events: CachedEvent[], homeCurrency: string | undefined, month: string, asOf: string): WrappedReport | null {
  const replay = buildHindcast(events, homeCurrency, asOf).find((m) => m.month === month);
  if (!replay) return null;

  const histories = [...merchantHistories(events, homeCurrency).values()];
  const inMonth = (date: string) => monthOf(date) === month;
  const top = replay.lines.filter((line) => line.actual > 0).map((line) => ({ name: line.name, amount: line.actual })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  const spent = roundCents(top.reduce((sum, item) => sum + item.amount, 0));

  return {
    month,
    src: 'hindcast',
    accuracy: spent > 0 ? Math.max(0, Math.round((1 - replay.memoryError / spent) * 100)) : null,
    memoryError: replay.memoryError,
    blankError: replay.blankError,
    spent,
    refunded: roundCents(histories.flatMap((h) => h.charges).filter((c) => c.refunded && inMonth(c.date)).reduce((sum, c) => sum + c.amount, 0)),
    declines: histories.reduce((sum, h) => sum + new Set(h.declines.filter((d) => inMonth(d.date)).map((d) => d.date)).size, 0),
    top,
  };
}
