'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { SAMPLE_DATA } from '@/lib/placeholder';

type WhyContextValue = { openWhyModal: (subject: string) => void };

const WhyContext = createContext<WhyContextValue | null>(null);

export function useWhy() {
  const value = useContext(WhyContext);
  if (!value) throw new Error('useWhy must be used inside WhyProvider');
  return value;
}

export function WhyProvider({ children }: { children: ReactNode }) {
  const [subject, setSubject] = useState<string | null>(null);
  const value = useMemo(() => ({ openWhyModal: setSubject }), []);
  const breakdown = SAMPLE_DATA.whyBreakdowns.default;

  return (
    <WhyContext.Provider value={value}>
      {children}
      {subject && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <button
            aria-label="Close panel"
            onClick={() => setSubject(null)}
            className="absolute inset-0 bg-overlay opacity-70"
          />
          <aside className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-secondary bg-primary shadow-xl">
            <header className="flex items-start justify-between gap-lg border-b border-secondary p-xl">
              <div>
                <div className="flex items-center gap-xs">
                  <HelpCircle className="w-5 h-5 text-fg-brand-primary shrink-0" />
                  <h2 className="text-heading-xs font-bold text-primary">Why this number?</h2>
                </div>
                <p className="mt-xs text-sm text-tertiary">The past records this number comes from.</p>
              </div>
              <button
                onClick={() => setSubject(null)}
                className="p-xs text-tertiary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-xl space-y-lg">
              <div>
                <span className="text-xs uppercase tracking-wider text-tertiary font-semibold">Number</span>
                <div className="text-heading-xs font-bold text-primary mt-xxs">{subject}</div>
                <div className="text-xs text-secondary mt-xs bg-secondary p-xs rounded-lg border border-secondary">
                  {breakdown.confidence}
                </div>
              </div>

              <div className="p-xl rounded-lg bg-secondary border border-secondary space-y-xs text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary">Charges due:</span>
                  <span className="font-mono text-primary font-semibold">${breakdown.baseCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Card fees:</span>
                  <span className="font-mono text-primary font-semibold">+${breakdown.crossBorderBuffer.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Safety buffer:</span>
                  <span className="font-mono text-primary font-semibold">+${breakdown.vatBuffer.toFixed(2)}</span>
                </div>
                <div className="border-t border-secondary pt-xs flex justify-between font-bold text-sm">
                  <span className="text-primary">Amount to fund:</span>
                  <span className="font-mono text-brand-primary">${breakdown.targetAmountUsd.toFixed(2)}</span>
                </div>
                <div className="text-right text-xs font-mono text-tertiary">
                  ≈ ₦{breakdown.targetAmountLocal.toLocaleString()} at {breakdown.exchangeRateUsed} NGN per USD
                </div>
              </div>

              <div className="space-y-xs">
                <span className="text-xs uppercase tracking-wider text-tertiary font-semibold">Records</span>
                {breakdown.historicalRecords.map((rec) => (
                  <div key={rec.emailSubject} className="p-sm rounded-lg bg-secondary border border-secondary text-xs space-y-xxs">
                    <div className="flex justify-between font-semibold text-primary">
                      <span>{rec.emailSubject}</span>
                      <span className="font-mono">${rec.billedUsd.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-secondary">{rec.description}</p>
                    <div className="text-xs text-utility-warning-700 font-medium">{rec.variance}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </WhyContext.Provider>
  );
}
