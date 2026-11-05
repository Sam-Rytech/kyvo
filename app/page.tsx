'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, HelpCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { SAMPLE_DATA } from '@/lib/placeholder';
import { useWhy } from '@/components/why-panel';

export default function DashboardPage() {
  const { openWhyModal } = useWhy();
  const [ignoreMemory, setIgnoreMemory] = useState(false);

  return (
<div className="space-y-xl">
  {/* Hero Sentence Card */}
  <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs relative overflow-hidden">
    <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-md">
      <div>
        <div className="text-xs uppercase font-semibold tracking-wider text-tertiary mb-xs">
          Next funding
        </div>
        <div className="flex items-baseline flex-wrap gap-x-sm gap-y-xs">
          <h1 className="text-heading-xl font-bold text-primary font-mono tracking-tight">
            Fund $61.40 by {SAMPLE_DATA.hero.deadlineDay}
          </h1>
          <span className="text-secondary text-lg font-mono">
            ≈ ₦{SAMPLE_DATA.hero.recommendedFundingLocal.toLocaleString()}
          </span>
          <button
            onClick={() => openWhyModal('Fund $61.40 by Friday')}
            className="inline-flex items-center gap-xxs text-sm font-semibold text-brand-primary hover:underline ml-xs focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
          >
            <span>Why?</span>
            <HelpCircle className="w-4 h-4 text-fg-brand-primary shrink-0" />
          </button>
        </div>
        <p className="text-sm text-secondary mt-xs">
          Covers 3 subscriptions due within 7 days, plus card fees and a safety buffer.
        </p>
      </div>
    </div>

    {/* Warning Card */}
    <div className="mt-lg p-md rounded-lg bg-utility-warning-50 border border-utility-warning-200 flex items-start gap-sm">
      <AlertTriangle className="w-5 h-5 text-fg-warning-primary shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-utility-warning-700">
          {SAMPLE_DATA.hero.warningHighlight}
        </div>
        <div className="text-xs text-utility-warning-700 mt-xxs">
          Chipper Primary (ending in 4821) has $11.39 available. Projected billing is $15.49 + $1.25 fee = $16.74. Decline fee if not topped up: $2.00.
        </div>
      </div>
      <button
        onClick={() => openWhyModal('Netflix $4.10 Deficit Detail')}
        className="text-xs font-semibold text-utility-warning-700 underline shrink-0 hover:text-primary"
      >
        Inspect Breakdown
      </button>
    </div>
  </div>

  {/* Grid: 7-Day Charges & USDC Vault */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
    {/* Left: 7 Days Upcoming Charges */}
    <div className="lg:col-span-2 rounded-xl border border-secondary bg-primary p-xl shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-md">
          <div>
            <h2 className="text-heading-xs font-semibold text-primary">Charges Due in Next 7 Days</h2>
            <p className="text-xs text-tertiary">Real billing dates learned from prior merchant emails</p>
          </div>
          <span className="text-xs font-mono font-medium text-secondary bg-secondary px-xs py-xxs rounded">
            4 items
          </span>
        </div>

        <div className="space-y-xs">
          {SAMPLE_DATA.upcomingCharges.map((charge) => (
            <div
              key={charge.id}
              className="p-md rounded-lg border border-secondary bg-secondary hover:bg-secondary-hover transition-colors flex items-center justify-between gap-md"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-xs">
                  <span className="text-sm font-semibold text-primary truncate">
                    {charge.merchant}
                  </span>
                  {charge.status === 'critical' && (
                    <span className="inline-flex items-center rounded-full border border-utility-error-200 bg-utility-error-50 px-md py-xxs text-xs font-medium text-utility-error-700">
                      Shortfall
                    </span>
                  )}
                  {charge.status === 'warning' && (
                    <span className="inline-flex items-center rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                      Tight Buffer
                    </span>
                  )}
                </div>
                <div className="text-xs text-tertiary flex items-center gap-xs mt-xxs">
                  <span>{charge.dueDate} ({charge.exactDate})</span>
                  <span>•</span>
                  <span>Paid via {charge.cardName} (••{charge.cardLast4})</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-primary">
                  ${charge.amountUsd.toFixed(2)}
                </div>
                <div className="text-xs font-mono text-tertiary">
                  ≈ ₦{charge.amountLocal.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-md mt-md border-t border-secondary flex items-center justify-between text-xs text-tertiary">
        <span>Local currency amounts are estimates</span>
        <Link href="/subscriptions" className="font-medium text-brand-primary hover:underline flex items-center gap-xxs">
          View all subscriptions <ChevronRight className="w-4 h-4 text-fg-brand-primary shrink-0" />
</Link>
      </div>
    </div>

    {/* Right: USDC Vault Card */}
    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            USDC vault
          </span>
        </div>

        <div className="mb-md">
          <div className="text-heading-md font-bold font-mono text-primary">
            ${SAMPLE_DATA.vault.usdcBalance.toFixed(2)}{' '}
            <span className="text-xs font-sans font-normal text-tertiary">USDC</span>
          </div>
          <div className="text-sm font-mono text-secondary mt-xxs">
            ≈ ₦{(SAMPLE_DATA.vault.usdcBalance * 1550).toLocaleString()}
          </div>
        </div>

        <div className="p-md rounded-lg bg-secondary border border-secondary space-y-xs">
          <div className="flex justify-between text-xs">
            <span className="text-secondary">Runway Remaining:</span>
            <span className="font-semibold text-primary font-mono">
              {SAMPLE_DATA.vault.runwayMonths} months
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-secondary">Avg Monthly Burn:</span>
            <span className="font-mono text-primary">
              ${SAMPLE_DATA.vault.monthlyBurnUsd.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-secondary">Last Topped Up:</span>
            <span className="text-tertiary">{SAMPLE_DATA.vault.lastRefillDate}</span>
          </div>
        </div>
      </div>

      <div className="mt-md pt-md border-t border-secondary">
        <button
          onClick={() => openWhyModal('USDC Reserve Buffer Calculation')}
          className="w-full inline-flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <span>How runway is calculated</span>
          <ArrowUpRight className="w-4 h-4 text-fg-quaternary shrink-0" />
        </button>
      </div>
    </div>
  </div>

  {/* Forecast Accuracy Line Chart Section */}
  <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-lg">
      <div>
        <div className="flex items-center gap-xs">
          <h2 className="text-heading-xs font-semibold text-primary">Forecast Accuracy</h2>
          <span className="inline-flex items-center rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
            Avg error $0.42/mo
          </span>
        </div>
        <p className="text-xs text-tertiary mt-xxs">
          Prediction error with Kyvo's memory, compared with a forecast that has no memory
        </p>
      </div>

      {/* Ignore Memory Toggle */}
      <div className="flex items-center gap-xs bg-secondary p-xs rounded-lg border border-secondary shrink-0">
        <span className="text-xs text-secondary font-medium">Ignore memory</span>
        <button
          onClick={() => setIgnoreMemory(!ignoreMemory)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            ignoreMemory ? 'bg-brand-solid' : 'bg-tertiary'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-primary shadow ring-0 transition duration-200 ease-in-out ${
              ignoreMemory ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>

    {/* Chart Visualization */}
    <div className="pt-sm">
      <div className="h-44 flex items-end gap-md sm:gap-xl border-b border-secondary pb-xs px-xs">
        {SAMPLE_DATA.accuracyTrend.map((item) => {
          const shownError = ignoreMemory ? item.baselineErrorUsd : item.errorUsd;
          const heightPct = Math.min(100, Math.round((shownError / 10) * 100));

          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-xs group">
              <span className="text-xs font-mono text-tertiary group-hover:text-primary transition-colors">
                ${shownError.toFixed(2)}
              </span>
              <div className="w-full max-w-[40px] bg-secondary rounded-t-md flex items-end h-32 relative">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    ignoreMemory
                      ? 'bg-utility-error-200 hover:bg-utility-error-500'
                      : 'bg-brand-solid hover:bg-brand-solid-hover'
                  }`}
                />
              </div>
              <span className="text-xs font-medium text-secondary">{item.month}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-tertiary pt-sm">
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <span className={`w-3 h-3 rounded-sm ${ignoreMemory ? 'bg-utility-error-200' : 'bg-brand-solid'}`} />
            <span>{ignoreMemory ? 'Naive Baseline Error (No Memory)' : 'Kyvo Learned Memory Error'}</span>
          </div>
        </div>
        <span className="text-xs">Values represented in USD variance per month</span>
      </div>
    </div>
  </div>
</div>
  );
}
