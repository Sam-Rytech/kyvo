'use client';

import { CheckCircle2 } from 'lucide-react';
import { SAMPLE_DATA } from '@/lib/placeholder';

export default function WrappedPage() {

  return (
<div className="space-y-lg">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
    <div>
      <h1 className="text-heading-xs font-semibold text-primary">Monthly Wrapped</h1>
      <p className="text-xs text-tertiary">
        Shareable performance report for {SAMPLE_DATA.wrapped.month}
      </p>
    </div>
  </div>

  <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs max-w-2xl mx-auto space-y-xl">
    <div className="text-center space-y-xs pb-lg border-b border-secondary">
      <span className="text-xs uppercase tracking-widest text-tertiary font-semibold">
        Kyvo Monthly Scorecard
      </span>
      <div className="text-heading-2xl font-mono font-bold text-brand-primary">
        {SAMPLE_DATA.wrapped.accuracyRate}%
      </div>
      <div className="text-sm font-medium text-secondary">
        Forecast Accuracy Rate across all recurring cards
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-md text-center">
      <div className="p-md rounded-lg bg-secondary border border-secondary">
        <div className="text-xs uppercase tracking-wider text-tertiary font-medium">Avg Error</div>
        <div className="text-heading-sm font-mono font-bold text-primary mt-xxs">
          ${SAMPLE_DATA.wrapped.averageErrorUsd.toFixed(2)}
        </div>
      </div>
      <div className="p-md rounded-lg bg-secondary border border-secondary">
        <div className="text-xs uppercase tracking-wider text-tertiary font-medium">Fees Prevented</div>
        <div className="text-heading-sm font-mono font-bold text-utility-success-700 mt-xxs">
          ${SAMPLE_DATA.wrapped.feesSavedUsd.toFixed(2)}
        </div>
      </div>
      <div className="p-md rounded-lg bg-secondary border border-secondary col-span-2 sm:col-span-1">
        <div className="text-xs uppercase tracking-wider text-tertiary font-medium">Declines Avoided</div>
        <div className="text-heading-sm font-mono font-bold text-primary mt-xxs">
          {SAMPLE_DATA.wrapped.cardsSavedFromDecline} cards
        </div>
      </div>
    </div>

    <div className="space-y-xs">
      <div className="text-xs uppercase tracking-wider font-semibold text-tertiary mb-xs">
        Learned Memory Highlights
      </div>
      {SAMPLE_DATA.wrapped.insights.map((insight, idx) => (
        <div key={idx} className="flex items-start gap-xs text-xs text-secondary p-xs bg-secondary rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-fg-success-primary shrink-0 mt-0.5" />
          <span>{insight}</span>
        </div>
      ))}
    </div>

    <div className="pt-md border-t border-secondary flex items-center justify-between">
      <span className="text-xs text-tertiary">Share report to Telegram channel</span>
      <button className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-xs font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring">
        Copy Report Link
      </button>
    </div>
  </div>
</div>
  );
}
