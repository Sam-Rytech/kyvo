'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download } from 'lucide-react';
import type { WrappedReport } from '@/lib/engines/wrapped';
import { monthLabel, usd } from '@/lib/format';

export function WrappedCard({ report, showMerchants }: { report: WrappedReport; showMerchants: boolean }) {
  const stats = [
    { label: 'Spent', value: usd(report.spent) },
    { label: 'Failed payments', value: String(report.declines) },
    { label: 'Refunded', value: usd(report.refunded) },
  ];
  return (
    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl">
      <div className="text-center space-y-xs pb-lg border-b border-secondary">
        <p className="text-xs uppercase tracking-widest text-tertiary font-semibold">
          Kyvo Dollar Wrapped · {monthLabel(report.month)} {report.month.slice(0, 4)}
        </p>
        {report.accuracy !== null ? (
          <>
            <p className="text-heading-2xl font-mono font-bold text-brand-primary">{report.accuracy}%</p>
            <p className="text-sm font-medium text-secondary">Forecast accuracy</p>
          </>
        ) : (
          <p className="text-heading-md font-bold text-primary">No dollar bills this month</p>
        )}
        <p className="text-sm text-secondary">
          Off by <strong className="font-mono">{usd(report.memoryError)}</strong> with memory, <strong className="font-mono">{usd(report.blankError)}</strong> without.
        </p>
        <p className="text-xs text-tertiary">Hindcast: replayed from real history, using only what was known before the month began.</p>
      </div>
      <dl className="grid grid-cols-3 gap-sm text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-secondary border border-secondary p-sm">
            <dt className="text-xs text-tertiary">{stat.label}</dt>
            <dd className="text-sm sm:text-heading-xs font-mono font-bold text-primary mt-xxs">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {showMerchants && report.top.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-tertiary mb-xs">Where it went</h2>
          <ul className="space-y-xxs text-sm">
            {report.top.map((item) => (
              <li key={item.name} className="flex justify-between gap-sm">
                <span className="text-primary truncate">{item.name}</span>
                <span className="font-mono text-primary">{usd(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WrappedView({ report, months, shareUrl }: { report: WrappedReport | null; months: string[]; shareUrl: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-secondary bg-primary p-2xl text-center shadow-xs">
        <h1 className="text-heading-xs font-semibold text-primary">No report yet</h1>
        <p className="text-sm text-secondary mt-xs">Your first Wrapped appears after a full month with a dollar bill.</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-2xl mx-auto">
      <div>
        <h1 className="text-heading-xs font-semibold text-primary">Dollar Wrapped</h1>
        <nav aria-label="Choose a month" className="flex flex-wrap gap-xs mt-xs">
          {months.map((month) => (
            <Link key={month} href={`/wrapped?m=${month}`} aria-current={month === report.month ? 'page' : undefined} className={`rounded-full border px-md py-xxs text-xs font-medium ${month === report.month ? 'border-brand bg-secondary text-brand-primary' : 'border-secondary text-secondary'}`}>
              {monthLabel(month)}
            </Link>
          ))}
        </nav>
      </div>

      <WrappedCard report={report} showMerchants />

      {shareUrl && (
        <div className="flex flex-wrap items-center gap-xs">
          <button onClick={() => void copy()} className="inline-flex items-center gap-xs rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand">
            {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
            {copied ? 'Link copied' : 'Copy share link'}
          </button>
          <a href={`${shareUrl}/opengraph-image`} download="kyvo-wrapped.png" className="inline-flex items-center gap-xs rounded-lg border border-secondary bg-primary px-md py-xs text-sm font-semibold text-secondary">
            <Download className="w-4 h-4" aria-hidden />
            Save image
          </a>
          <p className="w-full text-xs text-tertiary">The shared version leaves out what you spent it on.</p>
        </div>
      )}
    </div>
  );
}
