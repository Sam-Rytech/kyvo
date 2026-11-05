const SYMBOLS: Record<string, string> = { NGN: '₦', GHS: 'GH₵', KES: 'KSh ', EGP: 'E£', ZAR: 'R', UGX: 'USh ', INR: '₹', USD: '$' };

export const usd = (amount: number) => `$${amount.toFixed(2)}`;

/** Always approximate: card providers don't charge the market rate. */
export function approxLocal(amountUsd: number, rate: number | null, currency: string, markup = 0): string | null {
  if (rate === null || currency === 'USD') return null;
  return `≈ ${SYMBOLS[currency] ?? `${currency} `}${Math.round(amountUsd * rate * (1 + markup)).toLocaleString('en-US')}`;
}

/** Adds the year when it isn't the current one, so an old date can't be mistaken for a recent one. */
export function shortDate(date: string | null, now: Date = new Date()): string {
  if (!date) return '—';
  const sameYear = date.slice(0, 4) === String(now.getUTCFullYear());
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
}
