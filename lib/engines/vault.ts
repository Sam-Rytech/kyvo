// The dollar vault's runway: how long the balance lasts at what's really still billing.
import { roundCents } from './dates';
import { forecastMerchant } from './forecast';
import { merchantHistories } from './history';
import type { CachedEvent } from './subscriptions';

export type VaultRunway = { balance: number; monthlyBurn: number; months: number | null };

export function vaultRunway(balance: number, events: CachedEvent[], homeCurrency: string | undefined, asOf: string): VaultRunway {
  let burn = 0;
  for (const history of merchantHistories(events, homeCurrency).values()) {
    const forecast = forecastMerchant(history, asOf);
    if (forecast) burn += (forecast.amount * 30) / forecast.intervalDays;
  }
  const monthlyBurn = roundCents(burn);
  return { balance, monthlyBurn, months: monthlyBurn > 0 ? Math.round((balance / monthlyBurn) * 10) / 10 : null };
}
