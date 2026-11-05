import { beforeEach, describe, expect, it } from 'vitest';
import { createTatumClient, TatumUnavailableError } from '@/lib/chain/tatum-client';
import { getVaultTransactions, toVaultTransaction, USDC_COIN_TYPE, usdcFromBaseUnits } from '@/lib/chain/usdc';
import { clearRateCache, getUsdcRate, toLocal } from '@/lib/fx/tatum-rates';

function harness(responses: { status: number; body?: unknown }[]) {
  let clock = 1_000_000;
  const starts: number[] = [];
  const headers: Headers[] = [];
  const queue = [...responses];
  const client = createTatumClient('test-key', {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    fetch: (async (_url: string, init: RequestInit) => {
      starts.push(clock);
      headers.push(new Headers(init.headers));
      const next = queue.shift() ?? { status: 200, body: {} };
      return new Response(JSON.stringify(next.body ?? {}), { status: next.status });
    }) as typeof fetch,
  });
  return { client, starts, headers };
}

describe('Tatum client', () => {
  it('sends the API key and stays under 3 requests per second', async () => {
    const { client, starts, headers } = harness([]);
    await Promise.all([client.rest('/a'), client.rest('/b'), client.rest('/c'), client.rest('/d')]);
    expect(headers[0].get('x-api-key')).toBe('test-key');
    const inFirstSecond = starts.filter((t) => t < starts[0] + 1000).length;
    expect(inFirstSecond).toBeLessThanOrEqual(3);
  });

  it('retries a 429 and then succeeds', async () => {
    const { client, starts } = harness([{ status: 429 }, { status: 200, body: { ok: true } }]);
    await expect(client.rest('/a')).resolves.toEqual({ ok: true });
    expect(starts).toHaveLength(2);
  });

  it('never fakes data when credits run out', async () => {
    const { client } = harness([{ status: 402 }]);
    await expect(client.rest('/a')).rejects.toBeInstanceOf(TatumUnavailableError);
  });

  it('surfaces GraphQL errors instead of returning empty data', async () => {
    const { client } = harness([{ status: 200, body: { errors: [{ message: 'bad query' }] } }]);
    await expect(client.graphql('https://x', '{ a }')).rejects.toThrow('bad query');
  });
});

describe('vault history', () => {
  const responses = (fail = 0) => {
    const calls: { query: string; variables: Record<string, unknown> }[] = [];
    let failures = fail;
    const client = createTatumClient('k', {
      now: () => 0,
      sleep: async () => {},
      fetch: (async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string);
        calls.push(body);
        if (body.query.includes('checkpoint{')) return new Response(JSON.stringify({ data: { checkpoint: { sequenceNumber: 100_000_000 } } }));
        if (failures-- > 0) return new Response(JSON.stringify({ errors: [{ message: 'Failed to list transactions' }] }));
        return new Response(JSON.stringify({ data: { transactions: { nodes: [] } } }));
      }) as typeof fetch,
    });
    return { client, calls };
  };

  it('always gives the gateway a starting checkpoint, which it now requires', async () => {
    process.env.TATUM_SUI_GRAPHQL = 'https://example.test/graphql';
    const { client, calls } = responses();
    await getVaultTransactions(client, '0xabc');
    const query = calls.find((c) => c.variables?.a);
    expect(query?.variables.f).toBe(100_000_000 - 120 * 364_000);
  });

  it('looks back less far if refused, then reports the failure rather than saying no payments', async () => {
    process.env.TATUM_SUI_GRAPHQL = 'https://example.test/graphql';
    const once = responses(1);
    await expect(getVaultTransactions(once.client, '0xabc')).resolves.toEqual([]);
    expect(once.calls.at(-1)?.variables.f).toBe(100_000_000 - 30 * 364_000);
    const always = responses(9);
    await expect(getVaultTransactions(always.client, '0xabc')).rejects.toBeInstanceOf(TatumUnavailableError);
  });
});

describe('USDC', () => {
  it('converts base units exactly', () => {
    expect(usdcFromBaseUnits('0')).toBe(0);
    expect(usdcFromBaseUnits('10000')).toBe(0.01);
    expect(usdcFromBaseUnits('1234567890')).toBe(1234.56789);
  });

  it('counts only USDC received by the vault', () => {
    const vault = '0xvault';
    const tx = toVaultTransaction(
      {
        digest: 'd1',
        sender: { address: '0xfriend' },
        effects: {
          timestamp: '2026-11-08T10:00:00Z',
          status: 'SUCCESS',
          balanceChanges: {
            nodes: [
              { owner: { address: vault }, amount: '4500000', coinType: { repr: USDC_COIN_TYPE } },
              { owner: { address: '0xfriend' }, amount: '-4500000', coinType: { repr: USDC_COIN_TYPE } },
              { owner: { address: vault }, amount: '999', coinType: { repr: '0x2::sui::SUI' } },
            ],
          },
        },
      },
      vault,
    );
    expect(tx).toMatchObject({ digest: 'd1', sender: '0xfriend', success: true, usdcReceived: 4.5 });
  });
});

describe('FX', () => {
  beforeEach(() => clearRateCache());

  it('caches a rate for 10 minutes', async () => {
    const { client, starts } = harness([
      { status: 200, body: { value: '1344.73', basePair: 'NGN', source: 'CoinGecko', timestamp: 1 } },
      { status: 200, body: { value: '1400.00', basePair: 'NGN', source: 'CoinGecko', timestamp: 2 } },
    ]);
    expect((await getUsdcRate(client, 'NGN', 0)).value).toBe(1344.73);
    expect((await getUsdcRate(client, 'NGN', 9 * 60_000)).value).toBe(1344.73);
    expect(starts).toHaveLength(1);
    expect((await getUsdcRate(client, 'NGN', 11 * 60_000)).value).toBe(1400);
  });

  it('rejects an unusable rate', async () => {
    const { client } = harness([{ status: 200, body: { value: 'NaN', basePair: 'NGN', source: 'x', timestamp: 1 } }]);
    await expect(getUsdcRate(client, 'NGN', 0)).rejects.toThrow();
  });

  it('applies the provider markup', () => {
    expect(toLocal(10, 1000, 0.05)).toBeCloseTo(10500);
  });
});
