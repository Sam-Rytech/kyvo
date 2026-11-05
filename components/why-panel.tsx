'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { SAMPLE_DATA } from '@/lib/placeholder';

export type WhyRecord = { sentence: string; blobId: string };

export type WhyContent = {
  title: string;
  summary?: string;
  /** Each line of the sum, in order. The last can be marked as the total. */
  rows?: { label: string; value: string; total?: boolean; note?: string }[];
  notes?: string[];
  records: WhyRecord[];
};

type WhyContextValue = {
  /** The real panel: every number traced to records on Walrus */
  openWhy: (content: WhyContent) => void;
  /** Sample pages only */
  openWhyModal: (subject: string) => void;
};

const WhyContext = createContext<WhyContextValue | null>(null);

export function useWhy() {
  const value = useContext(WhyContext);
  if (!value) throw new Error('useWhy must be used inside WhyProvider');
  return value;
}

const shortBlob = (id: string) => `${id.slice(0, 8)}…${id.slice(-4)}`;

function sampleContent(subject: string): WhyContent {
  const b = SAMPLE_DATA.whyBreakdowns.default;
  return {
    title: subject,
    summary: b.confidence,
    rows: [
      { label: 'Charges due', value: `$${b.baseCharge.toFixed(2)}` },
      { label: 'Card fees', value: `+$${b.crossBorderBuffer.toFixed(2)}` },
      { label: 'Safety buffer', value: `+$${b.vatBuffer.toFixed(2)}` },
      { label: 'Amount to fund', value: `$${b.targetAmountUsd.toFixed(2)}`, total: true },
    ],
    notes: [`≈ ₦${b.targetAmountLocal.toLocaleString()} at ${b.exchangeRateUsed} NGN per USD. Sample data.`],
    records: [],
  };
}

export function WhyProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<WhyContent | null>(null);
  const value = useMemo(() => ({ openWhy: setContent, openWhyModal: (subject: string) => setContent(sampleContent(subject)) }), []);

  return (
    <WhyContext.Provider value={value}>
      {children}
      {content && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <button aria-label="Close panel" onClick={() => setContent(null)} className="absolute inset-0 bg-overlay opacity-70" />
          <aside role="dialog" aria-modal="true" aria-labelledby="why-title" className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-secondary bg-primary shadow-xl">
            <header className="flex items-start justify-between gap-lg border-b border-secondary p-xl">
              <div>
                <div className="flex items-center gap-xs">
                  <HelpCircle className="w-5 h-5 text-fg-brand-primary shrink-0" aria-hidden />
                  <h2 id="why-title" className="text-heading-xs font-bold text-primary">
                    Why this number?
                  </h2>
                </div>
                <p className="mt-xs text-sm text-tertiary">{content.title}</p>
              </div>
              <button onClick={() => setContent(null)} className="p-xs text-tertiary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring" aria-label="Close">
                <X className="w-4 h-4 text-fg-tertiary shrink-0" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-xl space-y-lg">
              {content.summary && <p className="text-sm text-secondary">{content.summary}</p>}

              {content.rows && content.rows.length > 0 && (
                <dl className="p-lg rounded-lg bg-secondary border border-secondary space-y-xs text-sm">
                  {content.rows.map((row) => (
                    <div key={row.label} className={row.total ? 'border-t border-secondary pt-xs' : undefined}>
                      <div className={`flex justify-between gap-md ${row.total ? 'font-bold' : ''}`}>
                        <dt className={row.total ? 'text-primary' : 'text-secondary'}>{row.label}</dt>
                        <dd className={`font-mono ${row.total ? 'text-brand-primary' : 'text-primary font-semibold'}`}>{row.value}</dd>
                      </div>
                      {row.note && <p className="text-xs text-tertiary mt-xxs">{row.note}</p>}
                    </div>
                  ))}
                </dl>
              )}

              {content.notes?.map((note) => (
                <p key={note} className="text-xs text-tertiary">
                  {note}
                </p>
              ))}

              {content.records.length > 0 && (
                <div className="space-y-xs">
                  <h3 className="text-xs uppercase tracking-wider text-tertiary font-semibold">Records on Walrus</h3>
                  {content.records.map((record) => (
                    <div key={record.blobId} className="p-sm rounded-lg bg-secondary border border-secondary text-xs space-y-xxs">
                      <p className="text-secondary">{record.sentence}</p>
                      <a href={`https://walruscan.com/mainnet/blob/${record.blobId}`} target="_blank" rel="noreferrer" className="font-mono text-brand-primary hover:underline">
                        {shortBlob(record.blobId)}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </WhyContext.Provider>
  );
}
