'use client';

import { AlertTriangle } from 'lucide-react';
import { SAMPLE_DATA } from '@/lib/placeholder';
import { useWhy } from '@/components/why-panel';

export default function CardsPage() {
  const { openWhyModal } = useWhy();

  return (
<div className="space-y-lg">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
    <div>
      <h1 className="text-heading-xs font-semibold text-primary">Virtual Cards & Exposure</h1>
      <p className="text-xs text-tertiary">
        Track which merchants hold your card numbers to prevent surprise renewal fees
      </p>
    </div>
  </div>

  <div className="space-y-md">
    {SAMPLE_DATA.cards.map((card) => (
      <div
        key={card.id}
        className="rounded-xl border border-secondary bg-primary p-xl shadow-xs hover:border-brand transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
          <div className="space-y-xs">
            <div className="flex items-center gap-xs flex-wrap">
              <h2 className="text-heading-xs font-bold text-primary">{card.name}</h2>
              <span className="text-xs font-mono text-tertiary">••{card.last4}</span>
              <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">
                {card.provider}
              </span>
              {card.isStale && (
                <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                  {card.staleNote}
                </span>
              )}
            </div>

            {/* Services Holding Headline */}
            <div className="text-sm font-semibold text-primary pt-xs">
              {card.servicesHolding.length} services hold Card {card.name.includes('Primary') ? 'A' : card.name.includes('Work') ? 'B' : 'C'}:
            </div>

            <div className="flex flex-wrap gap-xs pt-xxs">
              {card.servicesHolding.map((srv) => (
                <span
                  key={srv}
                  className="text-xs px-sm py-xxs rounded-md bg-secondary border border-secondary text-secondary"
                >
                  {srv}
                </span>
              ))}
            </div>

            <div className="text-xs text-utility-error-700 flex items-center gap-xs pt-xs">
              <AlertTriangle className="w-4 h-4 text-fg-error-primary shrink-0" />
              <span>{card.declineFeeWarning}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs uppercase tracking-wider text-tertiary">Current Balance</div>
            <div className="text-heading-sm font-mono font-bold text-primary">
              ${card.balanceUsd.toFixed(2)}
            </div>
            <div className="text-xs font-mono text-tertiary">
              ≈ ₦{card.balanceLocal.toLocaleString()}
            </div>
            <button
              onClick={() => openWhyModal(`Card Balance Audit: ${card.name}`)}
              className="text-xs text-brand-primary hover:underline font-medium mt-sm inline-block"
            >
              Audit card history
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
  );
}
