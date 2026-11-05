import { describe, expect, it } from 'vitest';
import { fundingMarkup, getProviderRule } from '@/config/providers';
import { guardAlerts } from '@/lib/engines/decline-guard';
import { buildFunding } from '@/lib/engines/forecast';
import { buildNotifications } from '@/lib/engines/notify';
import type { CachedEvent } from '@/lib/engines/subscriptions';
import { approxLocal } from '@/lib/format';

let id = 0;
const ev = (type: string, merchant: string | null, date: string, fields: Record<string, unknown> = {}): CachedEvent => ({ type, merchant, eventDate: date, blobId: `blob-${++id}`, sentence: `${type} ${date}`, event: { cur: 'USD', ...fields } });

const issued = (card: string, provider: string) => ev('card_added', null, '2026-07-01', { card, provider });
const monthly = (merchant: string, card: string, amt: number) => ['2026-08-18', '2026-09-18', '2026-10-18'].map((date) => ev('charge', merchant, date, { amt, card, name: merchant }));
const NOW = '2026-11-05';

describe('fundingMarkup', () => {
  it('is measured for Zenith, from a real payment', () => {
    expect(getProviderRule('Zenith Bank')?.fundingMarkup).toBe(0.0106);
    expect(fundingMarkup('Zenith Bank')).toBe(0.0106);
  });

  it('is zero when unmeasured or unknown, so nothing is made up', () => {
    expect(fundingMarkup('Grey')).toBe(0);
    expect(fundingMarkup('My Credit Union')).toBe(0);
    expect(fundingMarkup(null)).toBe(0);
  });
});

describe('approxLocal', () => {
  it('adds the markup', () => {
    expect(approxLocal(100, 1000, 'NGN', 0.05)).toBe('≈ ₦105,000');
  });

  it('uses the market rate by default', () => {
    expect(approxLocal(100, 1000, 'NGN')).toBe('≈ ₦100,000');
  });
});

describe('buildFunding markup', () => {
  it('uses the markup of the card being charged', () => {
    expect(buildFunding([issued('a', 'Zenith Bank'), ...monthly('claude', 'a', 20)], 'NGN', NOW).markup).toBe(0.0106);
  });

  it('is zero for a provider with no measured markup', () => {
    expect(buildFunding([issued('a', 'Grey'), ...monthly('claude', 'a', 20)], 'NGN', NOW).markup).toBe(0);
  });

  it('weights a mix of cards by the amount on each', () => {
    const events = [issued('a', 'Zenith Bank'), issued('b', 'Grey'), ...monthly('claude', 'a', 30), ...monthly('other', 'b', 10)];
    expect(buildFunding(events, 'NGN', NOW).markup).toBeCloseTo(0.00795, 5);
  });

  it('is zero with nothing to fund', () => {
    expect(buildFunding([], 'NGN', NOW).markup).toBe(0);
  });
});

describe('notifications', () => {
  const events = [issued('a', 'Zenith Bank'), ...monthly('claude', 'a', 21.5)];

  it('alerts carry the markup of their card', () => {
    expect(guardAlerts(events, 'NGN', '2026-11-17')[0].markup).toBe(0.0106);
  });

  it('the digest states the naira amount with the markup', () => {
    const list = buildNotifications({ events, homeCurrency: 'NGN', asOf: NOW, rate: 1345 });
    const digest = list.find((n) => n.key.startsWith('digest:'));
    const total = buildFunding(events, 'NGN', NOW).total;
    expect(digest?.text).toContain(approxLocal(total, 1345, 'NGN', 0.0106) as string);
  });
});
