'use client';

import { SAMPLE_DATA } from '@/lib/placeholder';
import { useWhy } from '@/components/why-panel';

export default function SubscriptionsPage() {
  const { openWhyModal } = useWhy();

  return (
<div className="space-y-lg">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
    <div>
      <h1 className="text-heading-xs font-semibold text-primary">Active Subscriptions</h1>
      <p className="text-xs text-tertiary">
        Learned recurring schedules, tax increments, and card routing
      </p>
    </div>
    <div className="flex items-center gap-xs">
      <span className="text-xs px-sm py-xs bg-primary border border-secondary rounded-lg text-secondary font-mono">
        5 tracking
      </span>
    </div>
  </div>

  <div className="rounded-xl border border-secondary bg-primary shadow-xs overflow-hidden">
    <div className="divide-y divide-secondary">
      {SAMPLE_DATA.subscriptions.map((sub) => (
        <div key={sub.id} className="p-xl hover:bg-secondary transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-md">
            <div className="space-y-xs">
              <div className="flex items-center gap-xs flex-wrap">
                <span className="font-bold text-primary text-md">{sub.merchant}</span>
                <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                  {sub.category}
                </span>
                {sub.priceChange && (
                  <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-mono font-semibold text-utility-warning-700">
                    ${sub.priceChange.fromUsd.toFixed(2)} → ${sub.priceChange.toUsd.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary">{sub.description}</p>
              <div className="text-xs text-tertiary flex items-center gap-xs pt-xxs">
                <span>Charged to <strong className="text-primary font-medium">{sub.cardAssigned}</strong> (••{sub.cardLast4})</span>
                <span>•</span>
                <span>Next: <strong className="text-primary font-medium">{sub.nextChargeDate}</strong></span>
              </div>
              <div className="text-xs text-quaternary bg-secondary px-xs py-xxs rounded-md border border-secondary inline-block mt-xs">
                📬 {sub.billingEmailSnippet}
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col justify-between items-end">
              <div>
                <div className="text-heading-xs font-mono font-bold text-primary">
                  ${sub.amountUsd.toFixed(2)}
                </div>
                <div className="text-xs font-mono text-tertiary">
                  ≈ ₦{sub.amountLocal.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => openWhyModal(`Subscription Analysis: ${sub.merchant}`)}
                className="text-xs text-brand-primary hover:underline font-medium mt-md"
              >
                View receipts & why
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
  );
}
