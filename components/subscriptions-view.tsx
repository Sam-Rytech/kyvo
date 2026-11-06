'use client';

import type { ReactNode } from 'react';
import { useWhy } from '@/components/why-panel';
import type { SubscriptionView } from '@/lib/engines/subscriptions';
import { approxLocal, shortDate } from '@/lib/format';

function money(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  return currency && currency !== 'USD' ? `${currency} ${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
}

function Tag({ alert, children }: { alert?: boolean; children: ReactNode }) {
  return <span className={`text-sm font-medium ${alert ? 'text-[#a81f17]' : 'text-tertiary'}`}>{children}</span>;
}

function Row({ sub, rate, currency }: { sub: SubscriptionView; rate: number | null; currency: string }) {
  const { openWhy } = useWhy();
  const local = sub.lastAmount !== null && (sub.currency ?? 'USD') === 'USD' ? approxLocal(sub.lastAmount, rate, currency) : null;

  return (
    <li className="border-t border-secondary py-md flex items-start justify-between gap-md">
      <div className="min-w-0 space-y-xxs">
        <p className="text-lg font-semibold text-primary">{sub.name}</p>
        <div className="flex flex-wrap gap-x-sm gap-y-xxs">
          {sub.usageBilled && <Tag>Usage-billed</Tag>}
          {sub.priceChange && (
            <Tag alert>
              Rose ${sub.priceChange.from.toFixed(2)} to ${sub.priceChange.to.toFixed(2)}
            </Tag>
          )}
          {sub.taxRise && <Tag>Now includes tax</Tag>}
          {sub.declineCount > 0 && <Tag alert>{sub.declineCount === 1 ? '1 decline' : `${sub.declineCount} declines`}</Tag>}
          {sub.refundCount > 0 && <Tag>{sub.refundCount === 1 ? '1 refund' : `${sub.refundCount} refunds`}</Tag>}
        </div>
        <p className="text-sm text-tertiary">
          {sub.lastDate ? `Last charged ${shortDate(sub.lastDate)}` : 'No successful charge yet'}
          {sub.card ? ` on ${/^\d{4}$/.test(sub.card) ? `card ${sub.card}` : sub.card}` : ''}
        </p>
        <button
          onClick={() =>
            openWhy({
              title: sub.name.toUpperCase(),
              summary: 'Everything Kyvo has learned about this subscription, from your billing emails.',
              rows: [
                { label: 'Last charge', value: money(sub.lastAmount, sub.currency), note: sub.lastDate ? shortDate(sub.lastDate) : undefined },
                ...(sub.declineCount > 0 ? [{ label: 'Failed payments', value: String(sub.declineCount) }] : []),
                ...(sub.refundCount > 0 ? [{ label: 'Refunds', value: String(sub.refundCount) }] : []),
              ],
              records: sub.records,
            })
          }
          className="text-sm font-semibold underline"
        >
          Why?
        </button>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold tabular-nums text-primary">{money(sub.lastAmount, sub.currency)}</p>
        {local && <p className="text-sm tabular-nums text-tertiary">{local}</p>}
      </div>
    </li>
  );
}

export function SubscriptionsList({ subscriptions, rate, currency }: { subscriptions: SubscriptionView[]; rate: number | null; currency: string }) {
  return (
    <ul>
      {subscriptions.map((sub) => (
        <Row key={sub.slug} sub={sub} rate={rate} currency={currency} />
      ))}
    </ul>
  );
}
