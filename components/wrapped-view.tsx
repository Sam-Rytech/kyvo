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
    <div className="space-y-xl">
      <div className="space-y-xs rounded-lg p-xl" style={{ background: 'var(--marigold)' }}>
        <p className="text-sm font-bold text-primary">
          Kyvo Dollar Wrapped, {monthLabel(report.month)} {report.month.slice(0, 4)}
        </p>
        {report.accuracy !== null ? (
          <>
            <p className="display text-primary text-[clamp(5rem,20vw,11rem)]">{report.accuracy}%</p>
            <p className="text-lg font-semibold text-primary">Forecast accuracy</p>
          </>
        ) : (
          <p className="display text-primary text-[clamp(3rem,10vw,6rem)]">No dollar bills this month</p>
        )}
        <p className="text-md text-primary">
          Off by <strong className="tabular-nums">{usd(report.memoryError)}</strong> with memory, <strong className="tabular-nums">{usd(report.blankError)}</strong> without.
        </p>
        <p className="text-sm text-primary">Hindcast: replayed from real history, using only what was known before the month began.</p>
      </div>
      <dl className="grid grid-cols-3 gap-sm border-t border-secondary pt-md">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-tertiary">{stat.label}</dt>
            <dd className="text-lg sm:text-heading-xs font-bold tabular-nums text-primary mt-xxs">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {showMerchants && report.top.length > 0 && (
        <div>
          <h2 className="section-title mb-xs">Where it went</h2>
          <ul className="space-y-xxs text-sm">
            {report.top.map((item) => (
              <li key={item.name} className="flex justify-between gap-sm">
                <span className="text-primary truncate">{item.name}</span>
                <span className="tabular-nums font-semibold text-primary">{usd(item.amount)}</span>
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
      <div className="space-y-xs">
        <h1 className="page-title">No report yet</h1>
        <p className="text-md text-secondary">Your first Wrapped appears after a full month with a dollar bill.</p>
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-3xl">
      <div>
        <h1 className="page-title">Dollar Wrapped</h1>
        <nav aria-label="Choose a month" className="flex flex-wrap gap-xs mt-xs">
          {months.map((month) => (
            <Link key={month} href={`/wrapped?m=${month}`} aria-current={month === report.month ? 'page' : undefined} className={`rounded-full border px-md py-xxs text-sm font-medium ${month === report.month ? 'border-brand bg-brand-solid text-primary-on-brand' : 'border-primary text-secondary'}`}>
              {monthLabel(month)}
            </Link>
          ))}
        </nav>
      </div>

      <WrappedCard report={report} showMerchants />

      {shareUrl && (
        <div className="flex flex-wrap items-center gap-xs">
          <button onClick={() => void copy()} className="inline-flex items-center gap-xs rounded-full bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand">
            {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
            {copied ? 'Link copied' : 'Copy share link'}
          </button>
          <a href={`${shareUrl}/opengraph-image`} download="kyvo-wrapped.png" className="inline-flex items-center gap-xs rounded-full border border-primary bg-primary px-md py-xs text-sm font-semibold text-secondary">
            <Download className="w-4 h-4" aria-hidden />
            Save image
          </a>
          <p className="w-full text-xs text-tertiary">The shared version leaves out what you spent it on.</p>
        </div>
      )}
    </div>
  );
}
