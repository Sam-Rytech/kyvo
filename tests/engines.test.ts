import { describe, expect, it } from 'vitest';
import { getProviderRule, transactionFee } from '@/config/providers';
import { blankForecasts, buildFunding, forecastMerchant } from '@/lib/engines/forecast';
import { addDays, medianOf } from '@/lib/engines/dates';
import { guardAlerts } from '@/lib/engines/decline-guard';
import { buildHindcast, pendingForecastMemories } from '@/lib/engines/hindcast';
import { merchantHistories, type MerchantHistory } from '@/lib/engines/history';
import { promiseStates } from '@/lib/engines/promises';
import { cardStates } from '@/lib/engines/registry';
import { deriveSubscriptions, type CachedEvent } from '@/lib/engines/subscriptions';
import { trialStates } from '@/lib/engines/trials';

let id = 0;
const ev = (type: string, merchant: string | null, date: string, fields: Record<string, unknown> = {}): CachedEvent => ({
  type,
  merchant,
  eventDate: date,
  blobId: `blob-${++id}`,
  sentence: `${type} ${merchant} ${date}`,
  event: { cur: 'USD', name: merchant, ...fields },
});

// The shape of the real account's history. Dollars and card labels are what the scan found.
const real = (): CachedEvent[] => [
  ev('charge', 'vercel', '2026-04-11', { amt: 1.99, card: '9876' }),
  ev('decline', 'paypal', '2026-04-19', { amt: 0.13, reason: 'Incorrect card expiry date' }),
  ev('charge', 'instawp', '2026-05-24', { amt: 2, card: '9876' }),
  ev('refund', 'instawp', '2026-05-24', { amt: 1, card: '9876' }),
  ev('card_added', 'instawp', '2026-05-24', { card: '9876' }),
  ev('charge', 'vercel', '2026-06-21', { amt: 0.99, card: '9876' }),
  ev('decline', 'anthropic', '2026-08-18', { amt: 20, card: '1234' }),
  ev('charge', 'anthropic', '2026-08-18', { amt: 20, card: '1234' }),
  ev('usage_bill', 'instawp', '2026-08-24', { amt: 4.51, card: '9876' }),
  ev('charge', 'instawp', '2026-08-24', { amt: 4.51 }),
  ev('refund', 'instawp', '2026-08-25', { amt: 4.51 }),
  ev('decline', 'anthropic', '2026-09-18', { amt: 20, card: '1234' }),
  ev('decline', 'anthropic', '2026-09-18', {}),
  ev('charge', 'anthropic', '2026-09-18', { amt: 20, card: '1234' }),
  ev('charge', 'msport', '2026-10-03', { amt: 200, cur: 'NGN' }),
  ev('charge', 'anthropic', '2026-10-18', { amt: 21.5 }),
];
const NOW = '2026-11-05';

const history = (events: CachedEvent[], slug: string): MerchantHistory => {
  const found = merchantHistories(events, 'NGN').get(slug);
  if (!found) throw new Error(`no history for ${slug}`);
  return found;
};

describe('dates', () => {
  it('adds days and takes medians', () => {
    expect(addDays('2026-10-18', 31)).toBe('2026-11-18');
    expect(medianOf([31, 30])).toBe(30.5);
    expect(medianOf([30, 31, 90])).toBe(31);
  });
});

describe('merchant history', () => {
  it('keeps only bills in foreign currency, and marks refunded charges', () => {
    const all = merchantHistories(real(), 'NGN');
    expect(all.has('msport')).toBe(false);
    const insta = all.get('instawp') as MerchantHistory;
    expect(insta.charges.map((c) => [c.date, c.amount, c.refunded])).toEqual([
      ['2026-05-24', 2, false],
      ['2026-08-24', 4.51, true],
    ]);
  });

  it('a $1 refund does not cancel a $2 charge', () => {
    expect(history(real(), 'instawp').charges[0].refunded).toBe(false);
  });

  it('counts a receipt and an invoice for the same money once', () => {
    expect(history(real(), 'instawp').charges).toHaveLength(2);
  });

  it('does not count a decline as a charge', () => {
    expect(history(real(), 'paypal').charges).toHaveLength(0);
    expect(history(real(), 'paypal').declines).toHaveLength(1);
  });
});

describe('forecastMerchant', () => {
  it('predicts the next Claude Pro charge from its real rhythm', () => {
    const f = forecastMerchant(history(real(), 'anthropic'), NOW);
    expect(f).toMatchObject({ slug: 'anthropic', nextDate: '2026-11-18', amount: 21.5, confidence: 'high', intervalDays: 31 });
    expect(f?.basis).toHaveLength(3);
  });

  it('does not predict one-off domain purchases long past their rhythm', () => {
    expect(forecastMerchant(history(real(), 'vercel'), NOW)).toBeNull();
  });

  it('does not predict a merchant whose only recent bill was refunded', () => {
    expect(forecastMerchant(history(real(), 'instawp'), NOW)).toBeNull();
  });

  it('never predicts a merchant with no successful charge', () => {
    expect(forecastMerchant(history(real(), 'paypal'), NOW)).toBeNull();
  });

  it('falls back to 30 days and low confidence on a first charge', () => {
    const events = [ev('charge', 'netflix', '2026-10-20', { amt: 15.49 })];
    expect(forecastMerchant(history(events, 'netflix'), NOW)).toMatchObject({ nextDate: '2026-11-19', amount: 15.49, confidence: 'low', intervalDays: 30 });
  });

  it('uses the median of the last 3 bills for usage billing', () => {
    const events = [
      ev('usage_bill', 'aws', '2026-07-02', { amt: 100 }),
      ev('usage_bill', 'aws', '2026-08-02', { amt: 3 }),
      ev('usage_bill', 'aws', '2026-09-02', { amt: 5 }),
      ev('usage_bill', 'aws', '2026-10-02', { amt: 4 }),
    ];
    expect(forecastMerchant(history(events, 'aws'), '2026-10-20')).toMatchObject({ amount: 4, usage: true, nextDate: '2026-11-02' });
  });

  it('applies a price change announced after the last charge', () => {
    const events = [
      ev('charge', 'netflix', '2026-09-03', { amt: 15.49 }),
      ev('charge', 'netflix', '2026-10-03', { amt: 15.49 }),
      ev('price_change', 'netflix', '2026-10-20', { from: 15.49, to: 17.99 }),
    ];
    expect(forecastMerchant(history(events, 'netflix'), '2026-10-25')?.amount).toBe(17.99);
  });

  it('ignores a price change already reflected in a later charge', () => {
    const events = [
      ev('price_change', 'netflix', '2026-09-01', { from: 10, to: 12 }),
      ev('charge', 'netflix', '2026-09-03', { amt: 15.49 }),
      ev('charge', 'netflix', '2026-10-03', { amt: 15.49 }),
    ];
    expect(forecastMerchant(history(events, 'netflix'), '2026-10-20')?.amount).toBe(15.49);
  });

  it('only uses what was known at the time, so a replay can\'t cheat', () => {
    const f = forecastMerchant(history(real(), 'anthropic'), '2026-10-01');
    expect(f).toMatchObject({ nextDate: '2026-10-19', amount: 20 });
  });
});

describe('blank forecast (what "Ignore memory" says)', () => {
  it('assumes every merchant ever seen bills monthly at its first price, forever', () => {
    const blank = blankForecasts(merchantHistories(real(), 'NGN'), NOW);
    expect(blank.map((b) => [b.slug, b.nextDate, b.amount])).toEqual([
      ['vercel', '2026-11-11', 1.99],
      ['anthropic', '2026-11-18', 20],
      ['instawp', '2026-11-24', 2],
    ]);
  });
});

describe('provider rules', () => {
  it('computes known fees and refuses to guess unknown ones', () => {
    expect(transactionFee(getProviderRule('Chipper'), 20)).toBe(0.9);
    expect(transactionFee(getProviderRule('Grey'), 20)).toBe(0);
    expect(transactionFee(getProviderRule('Raenest'), 20)).toBe(0.5);
    expect(transactionFee(getProviderRule('Bybit'), 20)).toBeNull();
    expect(transactionFee(getProviderRule('Zenith Bank'), 20)).toBeNull();
    expect(transactionFee(getProviderRule('Never Heard Of It'), 20)).toBeNull();
  });

  it('every rule that states a number cites a source', () => {
    for (const name of ['Chipper', 'Eversend', 'Grey', 'Raenest', 'Cleva']) {
      expect(getProviderRule(name)?.sources.length).toBeGreaterThan(0);
    }
  });
});

describe('cardStates', () => {
  const events = () => [...real(), ev('card_added', null, '2026-11-05', { card: '1234', provider: 'Zenith Bank' }), ev('card_added', null, '2026-11-05', { card: '9876', provider: 'Bybit' })];

  it('lists who holds each card and which provider issued it', () => {
    const cards = cardStates(events(), NOW);
    const zenith = cards.find((c) => c.card === '1234');
    const bybit = cards.find((c) => c.card === '9876');
    expect(zenith).toMatchObject({ provider: 'Zenith Bank' });
    expect(zenith?.holders.map((h) => h.slug)).toEqual(['anthropic']);
    expect(bybit?.holders.map((h) => h.slug).sort()).toEqual(['instawp', 'vercel']);
  });

  it('marks a holder stale after 60 days with no charge or mention', () => {
    const bybit = cardStates(events(), NOW).find((c) => c.card === '9876');
    expect(bybit?.holders.find((h) => h.slug === 'vercel')).toMatchObject({ stale: true, lastSeen: '2026-06-21' });
    const zenith = cardStates(events(), NOW).find((c) => c.card === '1234');
    expect(zenith?.holders[0].stale).toBe(false);
  });

  it('removes a holder the user says no longer has the card', () => {
    const cards = cardStates([...events(), ev('card_removed', 'vercel', '2026-11-05', { card: '9876' })], NOW);
    expect(cards.find((c) => c.card === '9876')?.holders.map((h) => h.slug)).toEqual(['instawp']);
  });

  it('works out the balance from the last entry, top-ups and charges since', () => {
    const list = [
      ev('card_balance', null, '2026-10-01', { card: '1234', amt: 30 }),
      ev('charge', 'anthropic', '2026-10-18', { amt: 21.5, card: '1234' }),
      ev('card_topup', null, '2026-10-20', { card: '1234', amt: 10 }),
    ];
    expect(cardStates(list, NOW).find((c) => c.card === '1234')?.balance).toBeCloseTo(18.5);
  });

  it('says the balance is unknown rather than assuming zero', () => {
    expect(cardStates(events(), NOW).find((c) => c.card === '1234')?.balance).toBeNull();
  });
});

describe('buildFunding', () => {
  const withProviders = () => [...real(), ev('card_added', null, '2026-11-05', { card: '1234', provider: 'Zenith Bank' })];

  it('funds the real next charge plus a buffer, by two days before it is due', () => {
    const funding = buildFunding(withProviders(), 'NGN', NOW);
    expect(funding.items.map((i) => [i.slug, i.amount, i.fee])).toEqual([['anthropic', 21.5, null]]);
    expect(funding.chargesTotal).toBe(21.5);
    expect(funding.buffer).toBeCloseTo(1.08, 2);
    expect(funding.total).toBeCloseTo(22.58, 2);
    expect(funding.fundBy).toBe('2026-11-16');
  });

  it('says which fees are unknown instead of inventing them', () => {
    expect(buildFunding(withProviders(), 'NGN', NOW).unknownFees).toEqual(['anthropic']);
  });

  it('adds a known provider fee', () => {
    const events = [...real(), ev('card_added', null, '2026-11-05', { card: '1234', provider: 'Chipper' })];
    const funding = buildFunding(events, 'NGN', NOW);
    expect(funding.items[0].fee).toBe(0.9);
    expect(funding.feesTotal).toBe(0.9);
    expect(funding.total).toBeCloseTo(21.5 + 0.9 + 1.12, 2);
  });

  it('subtracts a known card balance, and never asks for less than zero', () => {
    const some = buildFunding([...real(), ev('card_balance', null, '2026-11-01', { card: '1234', amt: 10 })], 'NGN', NOW);
    expect(some.knownBalance).toBe(10);
    expect(some.total).toBeCloseTo(12.58, 2);
    const plenty = buildFunding([...real(), ev('card_balance', null, '2026-11-01', { card: '1234', amt: 100 })], 'NGN', NOW);
    expect(plenty.total).toBe(0);
  });

  it('cites the exact records behind the number', () => {
    const funding = buildFunding(withProviders(), 'NGN', NOW);
    expect(funding.items[0].basis.length).toBe(3);
    expect(funding.items[0].basis.every((r) => r.blobId.startsWith('blob-'))).toBe(true);
  });

  it('has nothing to fund when nothing is expected', () => {
    const funding = buildFunding([ev('charge', 'vercel', '2026-01-11', { amt: 1.99 })], 'NGN', NOW);
    expect(funding).toMatchObject({ items: [], total: 0, fundBy: null });
  });
});

describe('buildHindcast', () => {
  const hindcast = () => buildHindcast(real(), 'NGN', NOW);

  it('replays each finished month, labelled hindcast', () => {
    const months = hindcast().map((m) => m.month);
    expect(months[0]).toBe('2026-04');
    expect(months.at(-1)).toBe('2026-10');
    expect(months).not.toContain('2026-11');
    expect(hindcast().every((m) => m.src === 'hindcast')).toBe(true);
  });

  it('scores the real Claude Pro months, with memory', () => {
    const sep = hindcast().find((m) => m.month === '2026-09');
    const oct = hindcast().find((m) => m.month === '2026-10');
    expect(sep?.memoryError).toBe(0);
    expect(oct?.memoryError).toBeCloseTo(1.5);
    const claude = oct?.lines.find((l) => l.slug === 'anthropic');
    expect(claude).toMatchObject({ predicted: 20, actual: 21.5, predictedDate: '2026-10-19', actualDate: '2026-10-18', daysOff: 1 });
  });

  it('charges a first-ever bill to both forecasts, because neither could know', () => {
    const aug = hindcast().find((m) => m.month === '2026-08');
    const claude = aug?.lines.find((l) => l.slug === 'anthropic');
    expect(claude).toMatchObject({ predicted: null, actual: 20, blankPredicted: null });
  });

  it('does not count a refunded bill as money spent', () => {
    const aug = hindcast().find((m) => m.month === '2026-08');
    expect(aug?.lines.find((l) => l.slug === 'instawp')?.actual).toBe(0);
  });

  it('the blank forecast keeps paying for things that stopped', () => {
    const oct = hindcast().find((m) => m.month === '2026-10');
    expect(oct?.blankError).toBeCloseTo(1.99 + 2 + 1.5);
  });

  it('months with nothing to learn from still appear', () => {
    expect(hindcast().find((m) => m.month === '2026-07')).toBeDefined();
  });
});

describe('results never depend on event order, as after a Total Recall', () => {
  const shuffled = () => {
    const events = real();
    return { forward: events, backward: [...events].reverse(), rotated: [...events.slice(7), ...events.slice(0, 7)] };
  };

  it.each(['backward', 'rotated'] as const)('hindcast, funding and memories match when %s', (order) => {
    const { forward, ...others } = shuffled();
    const other = others[order];
    expect(buildHindcast(other, 'NGN', NOW)).toEqual(buildHindcast(forward, 'NGN', NOW));
    expect(buildFunding(other, 'NGN', NOW)).toEqual(buildFunding(forward, 'NGN', NOW));
    expect(blankForecasts(merchantHistories(other, 'NGN'), NOW)).toEqual(blankForecasts(merchantHistories(forward, 'NGN'), NOW));
    expect(guardAlerts(other, 'NGN', NOW)).toEqual(guardAlerts(forward, 'NGN', NOW));
    expect(cardStates(other, NOW)).toEqual(cardStates(forward, NOW));
    expect(trialStates(other, NOW)).toEqual(trialStates(forward, NOW));
    expect(pendingForecastMemories(other, 'u1', 'NGN', NOW)).toEqual(pendingForecastMemories(forward, 'u1', 'NGN', NOW));
  });
});

describe('pendingForecastMemories', () => {
  it('writes hindcast and live events with stable keys and no blob-less claims', () => {
    const items = pendingForecastMemories(real(), 'u1', 'NGN', NOW);
    expect(items.some((i) => i.event.t === 'forecast' && i.event.src === 'hindcast')).toBe(true);
    expect(items.some((i) => i.event.t === 'forecast_result' && i.event.src === 'hindcast')).toBe(true);
    expect(items.some((i) => i.event.t === 'forecast' && i.event.src === 'live' && i.event.m === 'anthropic')).toBe(true);
    expect(items.every((i) => /^ky:u1:forecasts:\d{4}-\d{2}$/.test(i.namespace))).toBe(true);
    expect(items.find((i) => i.event.src === 'live')?.namespace).toBe('ky:u1:forecasts:2026-11');
    const again = pendingForecastMemories(real(), 'u1', 'NGN', NOW);
    expect(again.map((i) => i.idempotencyKey)).toEqual(items.map((i) => i.idempotencyKey));
    expect(new Set(items.map((i) => i.idempotencyKey)).size).toBe(items.length);
  });

  it('scores a live forecast once its charge arrives', () => {
    const liveForecast = ev('forecast', 'anthropic', '2026-11-18', { src: 'live', amt: 21.5, expected: '2026-11-18', h: 'x' });
    const events = [...real(), liveForecast, ev('charge', 'anthropic', '2026-11-19', { amt: 21.5 })];
    const items = pendingForecastMemories(events, 'u1', 'NGN', '2026-11-20');
    const result = items.find((i) => i.event.t === 'forecast_result' && i.event.src === 'live');
    expect(result?.event).toMatchObject({ m: 'anthropic', errUsd: 0, errDays: 1 });
  });
});

describe('guardAlerts', () => {
  const events = () => [...real(), ev('card_added', null, '2026-11-05', { card: '1234', provider: 'Eversend' })];

  it('warns from learned history, well before the charge', () => {
    const alerts = guardAlerts(events(), 'NGN', NOW);
    const claude = alerts.find((a) => a.slug === 'anthropic');
    expect(claude?.declinesRecent).toBe(2);
    expect(claude?.chargesRecent).toBe(3);
    expect(claude?.level).toBe('watch');
    expect(claude?.message).toContain('failed 2 of the last 3');
  });

  it('escalates inside 48 hours when the balance is short, and states the amount', () => {
    const list = [...events(), ev('card_balance', null, '2026-11-01', { card: '1234', amt: 5 })];
    const claude = guardAlerts(list, 'NGN', '2026-11-17').find((a) => a.slug === 'anthropic');
    expect(claude).toMatchObject({ level: 'danger', hoursAway: 24 });
    expect(claude?.shortfall).toBeCloseTo(16.5);
  });

  it('applies a provider rule with a stated count', () => {
    const list = [...real(), ev('card_added', null, '2026-11-05', { card: '1234', provider: 'Eversend' }), ev('charge', 'x', '2026-10-01', { amt: 5, card: '1234' }), ev('decline', 'anthropic', '2026-11-01', { amt: 20, card: '1234' }), ev('decline', 'anthropic', '2026-11-02', { amt: 20, card: '1234' })];
    const claude = guardAlerts(list, 'NGN', '2026-11-05').find((a) => a.slug === 'anthropic');
    expect(claude?.rule).toContain('2 declines');
    expect(claude?.rule).toContain('3');
    expect(claude?.level).toBe('danger');
  });

  it('a success resets the count, as providers count declines in a row', () => {
    const claude = guardAlerts(events(), 'NGN', NOW).find((a) => a.slug === 'anthropic');
    expect(claude?.consecutiveDeclines).toBe(0);
  });

  it('states no rule at all when the provider publishes none', () => {
    const list = [...real(), ev('card_added', null, '2026-11-05', { card: '1234', provider: 'Zenith Bank' })];
    expect(guardAlerts(list, 'NGN', NOW).find((a) => a.slug === 'anthropic')?.rule).toBeNull();
  });
});

describe('trialStates', () => {
  it('counts down active trials and reminds at 3 days and 1 day', () => {
    const events = [ev('trial_start', 'gplay', '2025-11-22', { endsAt: '2026-11-22' })];
    expect(trialStates(events, '2026-11-05')[0]).toMatchObject({ status: 'active', daysLeft: 17, remind: false });
    expect(trialStates(events, '2026-11-19')[0]).toMatchObject({ daysLeft: 3, remind: true });
    expect(trialStates(events, '2026-11-21')[0]).toMatchObject({ daysLeft: 1, remind: true });
    expect(trialStates(events, '2026-11-20')[0].remind).toBe(false);
  });

  it('asks to confirm when no end date is known, without inventing one', () => {
    const [t] = trialStates([ev('trial_start', 'gitlab', '2026-10-16', {})], NOW);
    expect(t).toMatchObject({ status: 'unknown', endsAt: null, daysLeft: null });
  });

  it('uses a later end date the user confirmed', () => {
    const [t] = trialStates([ev('trial_start', 'gitlab', '2026-10-16', {}), ev('trial_start', 'gitlab', '2026-10-16', { endsAt: '2026-11-15', src: 'user' })], NOW);
    expect(t).toMatchObject({ status: 'active', endsAt: '2026-11-15', daysLeft: 10 });
  });

  it('marks a finished trial, and spots one that turned into a charge', () => {
    const ended = trialStates([ev('trial_start', 'canva', '2026-05-19', { endsAt: '2026-08-17' })], NOW)[0];
    expect(ended).toMatchObject({ status: 'ended', converted: false });
    const converted = trialStates([ev('trial_start', 'canva', '2026-05-19', { endsAt: '2026-08-17' }), ev('charge', 'canva', '2026-08-18', { amt: 12.99 })], NOW)[0];
    expect(converted).toMatchObject({ status: 'ended', converted: true });
  });

  it('lists active trials first, soonest first', () => {
    const list = trialStates([ev('trial_start', 'old', '2026-01-01', { endsAt: '2026-02-01' }), ev('trial_start', 'later', '2026-11-01', { endsAt: '2026-12-01' }), ev('trial_start', 'soon', '2026-11-01', { endsAt: '2026-11-10' })], NOW);
    expect(list.map((t) => t.slug)).toEqual(['soon', 'later', 'old']);
  });
});

describe('promiseStates', () => {
  it('shows open promises with their age, newest state winning', () => {
    const open = ev('promise', 'gitlab', '2026-10-01', { text: 'Cancel GitLab', status: 'open', pid: 'p1' });
    expect(promiseStates([open], NOW)[0]).toMatchObject({ status: 'open', ageDays: 35, resurface: true });
    const done = ev('promise', 'gitlab', '2026-11-01', { text: 'Cancel GitLab', status: 'done', pid: 'p1' });
    expect(promiseStates([open, done], NOW)[0]).toMatchObject({ status: 'done', resurface: false });
  });

  it('does not nag about a promise made today', () => {
    expect(promiseStates([ev('promise', null, NOW, { text: 'x', status: 'open', pid: 'p2' })], NOW)[0].resurface).toBe(false);
  });
});

describe('hikes and tax', () => {
  const claude = () => [ev('charge', 'anthropic', '2026-09-18', { amt: 20 }), ev('charge', 'anthropic', '2026-10-18', { amt: 21.5 })];

  it('recognises a rise that matches VAT, and does not call it a hike', () => {
    const [sub] = deriveSubscriptions(claude(), 'NGN');
    expect(sub.priceChange).toBeNull();
    expect(sub.taxRise).toEqual({ from: 20, to: 21.5 });
  });

  it('compares subtotals when the email showed them', () => {
    const hike = [ev('charge', 'x', '2026-09-18', { amt: 20, subtotal: 20 }), ev('charge', 'x', '2026-10-18', { amt: 26.88, subtotal: 25 })];
    expect(deriveSubscriptions(hike, 'NGN')[0].priceChange).toEqual({ from: 20, to: 25 });
    const taxOnly = [ev('charge', 'x', '2026-09-18', { amt: 20, subtotal: 20 }), ev('charge', 'x', '2026-10-18', { amt: 24, subtotal: 20 })];
    expect(deriveSubscriptions(taxOnly, 'NGN')[0].priceChange).toBeNull();
  });

  it('still catches a real hike with no subtotal', () => {
    const [sub] = deriveSubscriptions([ev('charge', 'n', '2026-09-03', { amt: 15.49 }), ev('charge', 'n', '2026-10-03', { amt: 17.99 })], 'NGN');
    expect(sub.priceChange).toEqual({ from: 15.49, to: 17.99 });
    expect(sub.taxRise).toBeNull();
  });
});
