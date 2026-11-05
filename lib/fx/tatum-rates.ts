import type { TatumClient } from '@/lib/chain/tatum-client';

const CACHE_MS = 10 * 60 * 1000;

export type Rate = { value: number; base: string; source: string; timestamp: number };

const cache = new Map<string, { at: number; rate: Rate }>();

export function clearRateCache() {
  cache.clear();
}

/** USDC → home currency, cached for 10 minutes (architecture §8). */
export async function getUsdcRate(tatum: TatumClient, base: string, now: number = Date.now()): Promise<Rate> {
  const hit = cache.get(base);
  if (hit && now - hit.at < CACHE_MS) return hit.rate;

  const body = await tatum.rest<{ value: string; basePair: string; source: string; timestamp: number }>(
    `/v4/data/rate/symbol?symbol=USDC&basePair=${encodeURIComponent(base)}`,
  );
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Tatum returned an unusable rate for ${base}`);

  const rate: Rate = { value, base: body.basePair, source: body.source, timestamp: body.timestamp };
  cache.set(base, { at: now, rate });
  return rate;
}

/** A deliberately rough figure: providers don't charge Tatum's rate, so the UI shows "≈" (§7.1). */
export function toLocal(usd: number, rate: number, providerMarkup = 0): number {
  return usd * rate * (1 + providerMarkup);
}
