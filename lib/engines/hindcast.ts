// The learning loop (architecture §6.3). Each past month is replayed using only what was known
// before it began, and scored against what really happened. New forecasts are written as live.
import { encodeEnvelope, type EventType, type MemoryEvent } from '@/lib/memory/envelope';
import { eventKey, namespaces } from '@/lib/memory/namespaces';
import { diffDays, monthOf, nextMonth, roundCents } from './dates';
import { buildFunding, forecastMerchant } from './forecast';
import { merchantHistories } from './history';
import type { CachedEvent } from './subscriptions';

export type HindcastLine = {
  slug: string;
  name: string;
  /** What the forecast with memory expected this month, or null if nothing */
  predicted: number | null;
  predictedDate: string | null;
  /** What a forecast with no memory expected */
  blankPredicted: number | null;
  /** Money that really left, net of refunds */
  actual: number;
  actualDate: string | null;
  daysOff: number | null;
};

export type HindcastMonth = { month: string; src: 'hindcast'; memoryError: number; blankError: number; lines: HindcastLine[] };

export function buildHindcast(events: CachedEvent[], homeCurrency: string | undefined, asOf: string): HindcastMonth[] {
  const all = merchantHistories(events, homeCurrency);
  const firstCharge = [...all.values()].flatMap((h) => h.charges.map((c) => c.date)).sort()[0];
  if (!firstCharge) return [];

  const months: HindcastMonth[] = [];
  for (let month = monthOf(firstCharge); month < monthOf(asOf); month = nextMonth(month)) {
    const start = `${month}-01`;
    const end = `${nextMonth(month)}-01`;
    // Knowledge stops at the start of the month, refunds included.
    const known = merchantHistories(events.filter((e) => e.eventDate && e.eventDate < start), homeCurrency);

    const lines: HindcastLine[] = [];
    for (const history of all.values()) {
      const before = known.get(history.slug);
      const forecast = before ? forecastMerchant(before, start) : null;
      const expected = forecast && forecast.nextDate >= start && forecast.nextDate < end ? forecast : null;
      const blankPredicted = before?.charges[0]?.amount ?? null;
      const paid = history.charges.filter((c) => !c.refunded && c.date >= start && c.date < end);
      const actual = roundCents(paid.reduce((sum, c) => sum + c.amount, 0));
      const actualDate = paid[0]?.date ?? null;
      if (expected === null && blankPredicted === null && actual === 0) continue;
      lines.push({
        slug: history.slug,
        name: history.name,
        predicted: expected?.amount ?? null,
        predictedDate: expected?.nextDate ?? null,
        blankPredicted,
        actual,
        actualDate,
        daysOff: expected && actualDate ? Math.abs(diffDays(actualDate, expected.nextDate)) : null,
      });
    }

    months.push({
      month,
      src: 'hindcast',
      memoryError: roundCents(lines.reduce((sum, l) => sum + Math.abs((l.predicted ?? 0) - l.actual), 0)),
      blankError: roundCents(lines.reduce((sum, l) => sum + Math.abs((l.blankPredicted ?? 0) - l.actual), 0)),
      lines,
    });
  }
  return months;
}

export type ForecastMemory = { userId: string; namespace: string; text: string; idempotencyKey: string; event: MemoryEvent };

/** Everything still to be written to Walrus. Keys are stable, so repeats are ignored by the outbox. */
export function pendingForecastMemories(events: CachedEvent[], userId: string, homeCurrency: string | undefined, asOf: string): ForecastMemory[] {
    const items: ForecastMemory[] = [];

  const add = (type: EventType, src: string, keyDate: string, slug: string, amount: number | undefined, sentence: string, fields: Record<string, unknown>) => {
    const h = eventKey({ userId, type: `${type}:${src}`, merchant: slug, date: keyDate, amount });
    const event: MemoryEvent = { v: 1, t: type, m: slug, src, h, ...fields };
    items.push({ userId, namespace: namespaces.forecasts(userId, monthOf(keyDate)), idempotencyKey: h, event, text: encodeEnvelope(sentence, event) });
  };

  for (const month of buildHindcast(events, homeCurrency, asOf)) {
    for (const line of month.lines) {
      if (line.predicted !== null) {
        add('forecast', 'hindcast', month.month, line.slug, line.predicted, `Hindcast for ${month.month}: from earlier records, expected ${line.name} at USD ${line.predicted.toFixed(2)} on ${line.predictedDate}.`, {
          name: line.name,
          month: month.month,
          amt: line.predicted,
          expected: line.predictedDate,
          d: line.predictedDate,
        });
      }
      const errUsd = roundCents(Math.abs((line.predicted ?? 0) - line.actual));
      add('forecast_result', 'hindcast', month.month, line.slug, errUsd, `Hindcast for ${month.month}: ${line.name} really cost USD ${line.actual.toFixed(2)}, so the forecast was off by USD ${errUsd.toFixed(2)}.`, {
        name: line.name,
        month: month.month,
        actual: line.actual,
        errUsd,
        errDays: line.daysOff,
        d: `${month.month}-28`,
      });
    }
  }

  for (const item of buildFunding(events, homeCurrency, asOf).items) {
    add('forecast', 'live', item.nextDate, item.slug, item.amount, `Forecast made ${asOf}: expect ${item.name} at USD ${item.amount.toFixed(2)} on ${item.nextDate}.`, {
      name: item.name,
      amt: item.amount,
      fee: item.fee,
      expected: item.nextDate,
      made: asOf,
      d: item.nextDate,
    });
  }

  // A live forecast is scored the moment its charge arrives (§6.3, steps 2 and 3).
  const histories = merchantHistories(events, homeCurrency);
  for (const e of [...events].sort((a, b) => a.blobId.localeCompare(b.blobId))) {
    const expected = e.event.expected;
    const predicted = e.event.amt;
    if (e.type !== 'forecast' || e.event.src !== 'live' || !e.merchant || typeof expected !== 'string' || typeof predicted !== 'number') continue;
    const history = histories.get(e.merchant);
    const paid = history?.charges.find((c) => !c.refunded && Math.abs(diffDays(c.date, expected)) <= 15);
    if (!paid || !history) continue;
    const errUsd = roundCents(Math.abs(predicted - paid.amount));
    const errDays = Math.abs(diffDays(paid.date, expected));
    add('forecast_result', 'live', expected, e.merchant, predicted, `${history.name} really cost USD ${paid.amount.toFixed(2)} on ${paid.date}. The forecast said USD ${predicted.toFixed(2)} on ${expected}.`, {
      name: history.name,
      actual: paid.amount,
      errUsd,
      errDays,
      expected,
      d: paid.date,
    });
  }

  return items;
}
