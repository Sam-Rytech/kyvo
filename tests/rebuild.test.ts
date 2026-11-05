import { describe, expect, it } from 'vitest';
import { deriveSubscriptions, type CachedEvent } from '@/lib/engines/subscriptions';
import { encodeEnvelope } from '@/lib/memory/envelope';
import { decodedProfile, listUserNamespaces, recallNamespace, RebuildIncompleteError, RECALL_CAP, type RebuildMemory } from '@/lib/memory/rebuild';

function memory(pages: { name: string; memory_count: number }[][], results: unknown[] = [], dropped?: number): RebuildMemory {
  let page = 0;
  return {
    listNamespaces: async () => {
      const current = pages[page++];
      return { namespaces: current, next_cursor: 'c', has_more: page < pages.length, snapshot_version: 1 } as never;
    },
    recall: async () => ({ results, total: results.length, dropped_count: dropped }) as never,
  };
}

describe('listUserNamespaces', () => {
  it('walks every page and only returns this user', async () => {
    const m = memory([
      [{ name: 'ky:u1:profile', memory_count: 1 }, { name: 'ky:u2:profile', memory_count: 9 }],
      [{ name: 'ky:u1:m:netflix', memory_count: 3 }, { name: 'ky:probe', memory_count: 5 }],
    ]);
    expect(await listUserNamespaces(m, 'u1')).toEqual([
      { name: 'ky:u1:m:netflix', count: 3 },
      { name: 'ky:u1:profile', count: 1 },
    ]);
  });
});

describe('recallNamespace', () => {
  const hit = (i: number) => ({ text: `t${i}`, blob_id: `b${i}`, distance: 0.1, created_at: '2026-11-05T00:00:00Z' });

  it('returns every record when the count matches', async () => {
    const result = await recallNamespace(memory([], [hit(1), hit(2)]), { name: 'ns', count: 2 });
    expect(result.map((r) => r.blobId)).toEqual(['b1', 'b2']);
  });

  it('fails loudly when records are missing', async () => {
    await expect(recallNamespace(memory([], [hit(1)]), { name: 'ns', count: 2 })).rejects.toBeInstanceOf(RebuildIncompleteError);
  });

  it('names unreadable records', async () => {
    await expect(recallNamespace(memory([], [hit(1)], 1), { name: 'ns', count: 2 })).rejects.toThrow('1 unreadable');
  });

  it('fails loudly at the recall cap, because more may exist', async () => {
    const full = Array.from({ length: RECALL_CAP }, (_, i) => hit(i));
    await expect(recallNamespace(memory([], full), { name: 'ns', count: RECALL_CAP })).rejects.toBeInstanceOf(RebuildIncompleteError);
  });
});

describe('decodedProfile', () => {
  it('finds the profile among other memories, and ignores junk', () => {
    const profile = encodeEnvelope('Profile.', { v: 1, t: 'profile', homeCurrency: 'NGN', providers: ['Grey'] });
    expect(decodedProfile(['junk', profile])).toEqual({ homeCurrency: 'NGN', providers: ['Grey'] });
    expect(decodedProfile(['junk'])).toBeNull();
  });
});

describe('deriveSubscriptions', () => {
  const e = (type: string, date: string, amt: number | undefined, blobId: string, extra: Record<string, unknown> = {}): CachedEvent => ({
    type,
    merchant: 'anthropic',
    eventDate: date,
    blobId,
    sentence: `${type} ${date}`,
    event: { amt, cur: 'USD', name: 'Anthropic', ...extra },
  });

  const events = [
    e('charge', '2026-08-18', 20, 'b1', { card: '1234' }),
    e('decline', '2026-09-18', 20, 'b2'),
    e('charge', '2026-09-18', 20, 'b3', { card: '1234' }),
    e('charge', '2026-10-18', 21.5, 'b4', { card: '1234' }),
  ];

  it('derives the latest charge, declines, price change and every blob ID', () => {
    const [sub] = deriveSubscriptions(events);
    expect(sub).toMatchObject({ slug: 'anthropic', name: 'Anthropic', lastAmount: 21.5, currency: 'USD', lastDate: '2026-10-18', card: '1234', chargeCount: 3, declineCount: 1, priceChange: { from: 20, to: 21.5 } });
    expect(sub.records.map((r) => r.blobId).sort()).toEqual(['b1', 'b2', 'b3', 'b4']);
  });

  it('gives the same answer whatever order events arrive in, as after a rebuild', () => {
    expect(deriveSubscriptions([...events].reverse())).toEqual(deriveSubscriptions(events));
  });

  it('hides merchants billed only in the home currency', () => {
    const naira = { ...e('charge', '2026-10-17', 1000, 'n1'), merchant: 'msport' };
    naira.event = { amt: 1000, cur: 'NGN', name: 'MSport' };
    const list = deriveSubscriptions([naira, ...events], 'NGN');
    expect(list.map((s) => s.slug)).toEqual(['anthropic']);
    expect(deriveSubscriptions([naira], 'USD')).toHaveLength(1);
  });

  it('counts two emails about one failed attempt as one decline, and keeps both records', () => {
    const noAmount = { ...e('decline', '2026-09-18', undefined, 'b5'), event: { name: 'Anthropic' } };
    const [sub] = deriveSubscriptions([e('decline', '2026-09-18', 20, 'b6'), noAmount, e('decline', '2026-08-18', 20, 'b7')]);
    expect(sub.declineCount).toBe(2);
    expect(sub.records).toHaveLength(3);
  });

  it('counts a receipt and an invoice for the same money once, and keeps both records', () => {
    const [sub] = deriveSubscriptions([e('charge', '2026-08-24', 4.51, 'b1'), e('usage_bill', '2026-08-24', 4.51, 'b2')]);
    expect(sub.chargeCount).toBe(1);
    expect(sub.usageBilled).toBe(true);
    expect(sub.priceChange).toBeNull();
    expect(sub.records).toHaveLength(2);
  });

  it('only calls a rise of over 2% on a fixed-price bill a price change', () => {
    const hike = (from: number, to: number) => deriveSubscriptions([e('charge', '2026-08-18', from, 'a'), e('charge', '2026-09-18', to, 'b')])[0].priceChange;
    expect(hike(20, 21.5)).toEqual({ from: 20, to: 21.5 });
    expect(hike(20, 20.2)).toBeNull();
    expect(hike(1.99, 0.99)).toBeNull();
    const usage = deriveSubscriptions([e('charge', '2026-05-24', 2, 'a'), e('usage_bill', '2026-08-24', 4.51, 'b')])[0];
    expect(usage.priceChange).toBeNull();
  });

  it('does not treat a decline as a charge', () => {
    const [sub] = deriveSubscriptions([e('decline', '2026-09-18', 20, 'b1')]);
    expect(sub).toMatchObject({ chargeCount: 0, lastAmount: null, declineCount: 1 });
  });

  it('flags usage billing and refunds, and leaves out non-merchant events', () => {
    const list = deriveSubscriptions([
      e('usage_bill', '2026-08-24', 4.51, 'b1'),
      e('refund', '2026-08-25', 4.51, 'b2'),
      { ...e('profile', '2026-08-25', undefined, 'b3'), merchant: null },
      e('trial_start', '2026-08-25', undefined, 'b4'),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ usageBilled: true, refundCount: 1 });
    expect(list[0].records).toHaveLength(2);
  });
});
