import { eq } from 'drizzle-orm';
import { AlertTriangle } from 'lucide-react';
import { ScanPanel } from '@/components/scan-panel';
import { SampleSubscriptions } from '@/components/sample-subscriptions';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { getTatum } from '@/lib/chain/tatum-client';
import { deriveSubscriptions, type SubscriptionView } from '@/lib/engines/subscriptions';
import { getUsdcRate, type Rate } from '@/lib/fx/tatum-rates';

const shortBlob = (id: string) => `${id.slice(0, 8)}…${id.slice(-4)}`;

function money(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  return currency && currency !== 'USD' ? `${currency} ${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
}

// Whole class names, because Tailwind can't see classes assembled at runtime.
const BADGE_TONES = {
  warning: 'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700',
  error: 'border-utility-error-200 bg-utility-error-50 text-utility-error-700',
  gray: 'border-utility-gray-200 bg-utility-gray-50 text-utility-gray-700',
};

function Badge({ tone, children }: { tone: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-md py-xxs text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>;
}

function SubscriptionRow({ sub, rate }: { sub: SubscriptionView; rate: Rate | null }) {
  const local = rate && sub.lastAmount !== null && (sub.currency ?? 'USD') === 'USD' ? sub.lastAmount * rate.value : null;
  return (
    <div className="p-xl">
      <div className="flex items-start justify-between gap-md">
        <div className="min-w-0 space-y-xs">
          <div className="flex flex-wrap items-center gap-xs">
            <span className="font-bold text-md text-primary">{sub.name}</span>
            {sub.usageBilled && <Badge tone="gray">Usage-billed</Badge>}
            {sub.priceChange && (
              <Badge tone="warning">
                ${sub.priceChange.from.toFixed(2)} → ${sub.priceChange.to.toFixed(2)}
              </Badge>
            )}
            {sub.taxRise && <Badge tone="gray">Now includes tax: ${sub.taxRise.to.toFixed(2)}</Badge>}
            {sub.declineCount > 0 && <Badge tone="error">{sub.declineCount === 1 ? '1 decline' : `${sub.declineCount} declines`}</Badge>}
            {sub.refundCount > 0 && <Badge tone="gray">{sub.refundCount === 1 ? '1 refund' : `${sub.refundCount} refunds`}</Badge>}
          </div>
          <p className="text-xs text-tertiary">
            {sub.lastDate ? `Last charged ${sub.lastDate}` : 'No successful charge yet'}
            {sub.card ? ` • card ${sub.card}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-heading-xs font-mono font-bold text-primary">{money(sub.lastAmount, sub.currency)}</div>
          {local !== null && <div className="text-xs font-mono text-tertiary">≈ {rate?.base} {Math.round(local).toLocaleString()}</div>}
        </div>
      </div>

      <details className="mt-sm">
        <summary className="text-xs font-medium text-brand-primary cursor-pointer">
          {sub.records.length === 1 ? '1 record' : `${sub.records.length} records`} on Walrus
        </summary>
        <ul className="mt-xs space-y-xs">
          {sub.records.map((record) => (
            <li key={record.blobId} className="rounded-lg border border-secondary bg-secondary p-xs text-xs">
              <p className="text-secondary">{record.sentence}</p>
              <a href={`https://walruscan.com/mainnet/blob/${record.blobId}`} target="_blank" rel="noreferrer" className="font-mono text-brand-primary hover:underline">
                {shortBlob(record.blobId)}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session) return <SampleSubscriptions />;

  const db = createDb();
  const [events, [user]] = await Promise.all([
    db.select().from(cacheEvents).where(eq(cacheEvents.userId, session.userId)),
    db.select().from(users).where(eq(users.id, session.userId)),
  ]);
  const subscriptions = deriveSubscriptions(events, user?.homeCurrency);

  let rate: Rate | null = null;
  let rateFailed = false;
  const home = user?.homeCurrency ?? 'NGN';
  if (subscriptions.length > 0 && home !== 'USD') {
    try {
      rate = await getUsdcRate(getTatum(), home);
    } catch {
      rateFailed = true;
    }
  }

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="text-heading-xs font-semibold text-primary">Subscriptions</h1>
        <p className="text-xs text-tertiary">Learned from your billing emails. Every record is stored on Walrus Memory.</p>
      </div>

      <ScanPanel />

      {rateFailed && (
        <p className="flex items-center gap-xs text-xs text-utility-warning-700">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          Exchange rates are temporarily unavailable, so local amounts are hidden.
        </p>
      )}

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-secondary bg-primary p-2xl text-center shadow-xs">
          <h2 className="text-heading-xs font-semibold text-primary">Nothing here yet</h2>
          <p className="text-sm text-secondary mt-xs">Run a scan, and your dollar subscriptions will show up here on their own.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-secondary bg-primary shadow-xs divide-y divide-secondary">
          {subscriptions.map((sub) => (
            <SubscriptionRow key={sub.slug} sub={sub} rate={rate} />
          ))}
        </div>
      )}
    </div>
  );
}
