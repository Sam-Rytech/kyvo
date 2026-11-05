import { describe, expect, it } from 'vitest';
import { makeShareCode, readShareCode } from '@/lib/auth/crypto';
import type { CachedEvent } from '@/lib/engines/subscriptions';
import { buildWrapped, wrappedMonths } from '@/lib/engines/wrapped';

let id = 0;
const ev = (type: string, merchant: string, date: string, fields: Record<string, unknown> = {}): CachedEvent => ({ type, merchant, eventDate: date, blobId: `blob-${++id}`, sentence: `${type} ${date}`, event: { cur: 'USD', name: merchant, ...fields } });

const events = () => [
  ev('charge', 'Vercel', '2026-06-21', { amt: 0.99 }),
  ev('decline', 'Claude', '2026-09-18', { amt: 20 }),
  ev('charge', 'Claude', '2026-08-18', { amt: 20 }),
  ev('charge', 'Claude', '2026-09-18', { amt: 20 }),
  ev('charge', 'Claude', '2026-10-18', { amt: 21.5 }),
  ev('charge', 'InstaWP', '2026-10-05', { amt: 4 }),
  ev('refund', 'InstaWP', '2026-10-06', { amt: 4 }),
];
const NOW = '2026-11-05';

describe('wrappedMonths', () => {
  it('lists finished months with activity, newest first', () => {
    const months = wrappedMonths(events(), 'NGN', NOW);
    expect(months[0]).toBe('2026-10');
    expect(months).not.toContain('2026-11');
    expect(months).not.toContain('2026-07');
  });

  it('is empty with no history', () => {
    expect(wrappedMonths([], 'NGN', NOW)).toEqual([]);
  });
});

describe('buildWrapped', () => {
  it('headlines forecast accuracy, from the real replay', () => {
    const report = buildWrapped(events(), 'NGN', '2026-10', NOW);
    expect(report).toMatchObject({ month: '2026-10', src: 'hindcast', spent: 21.5, memoryError: 1.5 });
    expect(report?.accuracy).toBe(93);
    expect(report?.blankError).toBeGreaterThan(report?.memoryError ?? 0);
  });

  it('is exactly 100 when the forecast was right', () => {
    expect(buildWrapped(events(), 'NGN', '2026-09', NOW)?.accuracy).toBe(100);
  });

  it('never goes below zero', () => {
    expect(buildWrapped(events(), 'NGN', '2026-08', NOW)?.accuracy).toBe(0);
  });

  it('has no accuracy for a month with no spending, rather than dividing by zero', () => {
    const report = buildWrapped([ev('charge', 'A', '2026-06-01', { amt: 5 }), ev('charge', 'A', '2026-08-01', { amt: 5 })], 'NGN', '2026-07', NOW);
    expect(report?.accuracy).toBeNull();
  });

  it('counts refunded money out, and refunds separately', () => {
    const report = buildWrapped(events(), 'NGN', '2026-10', NOW);
    expect(report?.spent).toBe(21.5);
    expect(report?.refunded).toBe(4);
  });

  it('counts failed-payment days', () => {
    expect(buildWrapped(events(), 'NGN', '2026-09', NOW)?.declines).toBe(1);
  });

  it('lists what you spent on, biggest first', () => {
    const report = buildWrapped([ev('charge', 'B', '2026-10-01', { amt: 5 }), ev('charge', 'A', '2026-10-02', { amt: 9 })], 'NGN', '2026-10', NOW);
    expect(report?.top.map((t) => t.name)).toEqual(['A', 'B']);
  });

  it('refuses a month with no data', () => {
    expect(buildWrapped(events(), 'NGN', '2020-01', NOW)).toBeNull();
    expect(buildWrapped(events(), 'NGN', '2026-11', NOW)).toBeNull();
  });

  it('gives the same report whatever order events arrive in', () => {
    const list = events();
    expect(buildWrapped([...list].reverse(), 'NGN', '2026-10', NOW)).toEqual(buildWrapped(list, 'NGN', '2026-10', NOW));
  });
});

describe('share codes', () => {
  const ROOT = 'a'.repeat(64);

  it('round-trips across many values, including signatures with underscores', () => {
    for (let i = 0; i < 300; i++) {
      const user = i.toString(16).padStart(16, '0');
      expect(readShareCode(makeShareCode(user, '2026-10', ROOT), ROOT)).toEqual({ userId: user, month: '2026-10' });
    }
  });

  it('refuses a changed month, a changed user, a wrong key and junk', () => {
    const code = makeShareCode('u1', '2026-10', ROOT);
    expect(readShareCode(code.replace('2026-10', '2026-09'), ROOT)).toBeNull();
    expect(readShareCode(code.replace('u1', 'u2'), ROOT)).toBeNull();
    expect(readShareCode(code, 'b'.repeat(64))).toBeNull();
    expect(readShareCode('junk', ROOT)).toBeNull();
  });
});
