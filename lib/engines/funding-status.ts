// The one sentence at the top of Today, and the status its colour shows (spec: the funding sentence).
import { approxLocal, shortDate, usd } from '@/lib/format';

export type FundingStatus = 'covered' | 'soon' | 'risk';

type FundingLike = { total: number; fundBy: string | null; markup: number; items: { nextDate: string }[] };
type AlertLike = { level: 'info' | 'watch' | 'danger'; shortfall: number | null };

export function fundingStatus(funding: Pick<FundingLike, 'total' | 'items'>, alerts: AlertLike[]): FundingStatus {
  if (alerts.some((alert) => alert.level === 'danger' || alert.shortfall !== null)) return 'risk';
  if (funding.items.length === 0 || funding.total === 0) return 'covered';
  return 'soon';
}

export function fundingHeadline({ funding, status, rate, currency, asOf }: { funding: FundingLike; status: FundingStatus; rate: number | null; currency: string; asOf: string }): string {
  const now = new Date(`${asOf}T00:00:00Z`);
  if (funding.total === 0) {
    if (status === 'risk') return 'A card needs attention';
    const last = funding.items.map((item) => item.nextDate).sort().at(-1);
    return last ? `You're covered through ${shortDate(last, now)}` : 'Nothing to fund in the next 30 days';
  }
  const local = approxLocal(funding.total, rate, currency, funding.markup);
  const amount = local ? `about ${local.replace('≈ ', '')}` : usd(funding.total);
  return funding.fundBy === asOf ? `Fund ${amount} today` : `Fund ${amount} by ${shortDate(funding.fundBy, now)}`;
}
