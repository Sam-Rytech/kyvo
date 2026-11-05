// Calendar dates as YYYY-MM-DD, always in UTC, so results don't shift with the server's timezone.
const DAY_MS = 86_400_000;
const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

export const today = (now: number = Date.now()) => new Date(now).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return new Date(toMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(later: string, earlier: string): number {
  return Math.round((toMs(later) - toMs(earlier)) / DAY_MS);
}

export function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const monthOf = (date: string) => date.slice(0, 7);

export function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

/** The next time this day of the month comes round on or after a date, shortened for short months. */
export function nextMonthlyDate(firstDate: string, asOf: string): string {
  const day = Number(firstDate.slice(8, 10));
  let month = monthOf(asOf);
  for (;;) {
    const [year, m] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const candidate = `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    if (candidate >= asOf) return candidate;
    month = nextMonth(month);
  }
}

export const roundCents = (value: number) => Math.round(value * 100) / 100;
