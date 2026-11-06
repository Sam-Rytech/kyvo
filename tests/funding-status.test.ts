import { describe, expect, it } from 'vitest';
import { fundingHeadline, fundingStatus } from '@/lib/engines/funding-status';

const funding = (total: number, dates: string[] = ['2026-11-18'], fundBy: string | null = '2026-11-16') => ({ total, fundBy, markup: 0, items: dates.map((nextDate) => ({ nextDate })) });
const alert = (level: 'info' | 'watch' | 'danger', shortfall: number | null = null) => ({ level, shortfall });

describe('fundingStatus', () => {
  it('is covered when nothing is due', () => {
    expect(fundingStatus(funding(0, []), [])).toBe('covered');
  });

  it('is covered when the known balance pays for it', () => {
    expect(fundingStatus(funding(0), [])).toBe('covered');
  });

  it('is fund soon when money is due and nothing is urgent', () => {
    expect(fundingStatus(funding(22.58), [])).toBe('soon');
    expect(fundingStatus(funding(22.58), [alert('info')])).toBe('soon');
    expect(fundingStatus(funding(22.58), [alert('watch')])).toBe('soon');
  });

  it('is at risk on a danger alert', () => {
    expect(fundingStatus(funding(22.58), [alert('watch'), alert('danger')])).toBe('risk');
  });

  it('is at risk when a card is known to be short, even at a lower alert level', () => {
    expect(fundingStatus(funding(22.58), [alert('watch', 5)])).toBe('risk');
  });

  it('a danger alert outranks being covered', () => {
    expect(fundingStatus(funding(0), [alert('danger')])).toBe('risk');
  });
});

describe('fundingHeadline', () => {
  const base = { status: 'soon' as const, rate: 1344.5, currency: 'NGN', asOf: '2026-11-06' };

  it('leads with the approximate local amount', () => {
    expect(fundingHeadline({ ...base, funding: funding(22.58) })).toBe('Fund about ₦30,359 by 16 Nov');
  });

  it('includes the provider markup', () => {
    expect(fundingHeadline({ ...base, funding: { ...funding(22.58), markup: 0.0106 } })).toBe('Fund about ₦30,681 by 16 Nov');
  });

  it('uses dollars, without "about", when the rate is down', () => {
    expect(fundingHeadline({ ...base, rate: null, funding: funding(22.58) })).toBe('Fund $22.58 by 16 Nov');
  });

  it('uses dollars for a USD account', () => {
    expect(fundingHeadline({ ...base, currency: 'USD', rate: null, funding: funding(22.58) })).toBe('Fund $22.58 by 16 Nov');
  });

  it('says today when the date has arrived', () => {
    expect(fundingHeadline({ ...base, funding: funding(22.58, ['2026-11-07'], '2026-11-06') })).toBe('Fund about ₦30,359 today');
  });

  it('says how far cover lasts, using the last charge', () => {
    expect(fundingHeadline({ ...base, status: 'covered', funding: funding(0, ['2026-11-18', '2026-11-25']) })).toBe("You're covered through 25 Nov");
  });

  it('says so when nothing is due', () => {
    expect(fundingHeadline({ ...base, status: 'covered', funding: funding(0, [], null) })).toBe('Nothing to fund in the next 30 days');
  });

  it('adds the year for a date in another year', () => {
    expect(fundingHeadline({ ...base, asOf: '2026-12-28', funding: funding(22.58, ['2027-01-05'], '2027-01-03') })).toBe('Fund about ₦30,359 by 3 Jan 2027');
  });

  it('still asks for funding when at risk', () => {
    expect(fundingHeadline({ ...base, status: 'risk', funding: funding(22.58) })).toBe('Fund about ₦30,359 by 16 Nov');
  });

  it('never tells someone at risk that they are covered', () => {
    expect(fundingHeadline({ ...base, status: 'risk', funding: funding(0) })).toBe('A card needs attention');
  });
});
