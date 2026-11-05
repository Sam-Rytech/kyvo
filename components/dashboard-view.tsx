'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, HelpCircle } from 'lucide-react';
import { MemorySyncStatus } from '@/components/memory-sync';
import { TelegramCard } from '@/components/telegram-card';
import { VaultCard } from '@/components/vault-card';
import { useWhy, type WhyRecord } from '@/components/why-panel';
import type { GuardAlert } from '@/lib/engines/decline-guard';
import type { BlankForecast, Funding } from '@/lib/engines/forecast';
import type { HindcastMonth } from '@/lib/engines/hindcast';
import type { PromiseState } from '@/lib/engines/promises';
import type { TrialState } from '@/lib/engines/trials';
import type { VaultRunway } from '@/lib/engines/vault';
import { approxLocal, monthLabel, shortDate, usd } from '@/lib/format';

type Props = {
  funding: Funding;
  blank: BlankForecast[];
  hindcast: HindcastMonth[];
  alerts: GuardAlert[];
  trials: TrialState[];
  promises: PromiseState[];
  rate: number | null;
  rateSource: string | null;
  currency: string;
  hasMemories: boolean;
  vault: { address: string | null; runway: VaultRunway | null; unavailable: boolean };
  telegram: { linked: boolean; linkUrl: string };
  readOnly: boolean;
};

export function DashboardView({ funding, blank, hindcast, alerts, trials, promises, rate, rateSource, currency, hasMemories, vault, telegram, readOnly }: Props) {
  const { openWhy } = useWhy();
  const [ignoreMemory, setIgnoreMemory] = useState(false);

  const blankTotal = blank.reduce((sum, b) => sum + b.amount, 0);
  const blankBy = blank[0]?.nextDate ?? null;
  const shownTotal = ignoreMemory ? blankTotal : funding.total;
  const local = approxLocal(shownTotal, rate, currency);

  const records: WhyRecord[] = funding.items.flatMap((item) => item.basis.map((b) => ({ sentence: b.sentence, blobId: b.blobId })));

  function explainFunding() {
    if (ignoreMemory) {
      openWhy({
        title: `${usd(blankTotal)} with memory ignored`,
        summary: 'Without memory, a forecast can only assume the first price ever seen repeats every month: no fees, no refunds, and nothing ever cancelled.',
        rows: [...blank.map((b) => ({ label: `${b.name}, ${shortDate(b.nextDate)}`, value: usd(b.amount) })), { label: 'Total', value: usd(blankTotal), total: true }],
        records: [],
      });
      return;
    }
    const notes: string[] = [];
    if (funding.unknownFees.length) notes.push(`No fee is included for ${funding.items.filter((i) => i.fee === null).map((i) => i.name).join(', ')}, because the card's fees couldn't be confirmed. The buffer helps cover this.`);
    if (funding.unknownBalanceCards.length) notes.push(`Nothing is subtracted for what's already on your card, because Kyvo doesn't know the balance. Add it on the Cards page.`);
    if (rate !== null && rateSource) notes.push(`Local amount uses the ${rateSource} USDC rate of ${rate.toLocaleString('en-US')} ${currency}, from Tatum. Your provider's rate will differ, so treat it as approximate.`);
    openWhy({
      title: `Fund ${usd(funding.total)} by ${shortDate(funding.fundBy)}`,
      summary: `Worked out from your own billing history, for the next 30 days. Fund two days early so the charge can't catch you short.`,
      rows: [
        ...funding.items.map((item) => ({
          label: `${item.name}, ${shortDate(item.nextDate)}`,
          value: usd(item.amount),
          note: `Every ${item.intervalDays} days, ${item.usage ? 'usage-billed: median of recent bills' : `from ${item.basis.length} past ${item.basis.length === 1 ? 'charge' : 'charges'}`}. ${item.confidence === 'low' ? 'Low confidence: only one charge so far.' : ''}`.trim(),
        })),
        ...(funding.feesTotal > 0 ? [{ label: 'Card fees', value: `+${usd(funding.feesTotal)}` }] : []),
        { label: 'Safety buffer (5%, at least $1)', value: `+${usd(funding.buffer)}` },
        ...(funding.knownBalance > 0 ? [{ label: 'Already on your cards', value: `−${usd(funding.knownBalance)}` }] : []),
        { label: 'Amount to fund', value: usd(funding.total), total: true, note: local ?? undefined },
      ],
      notes,
      records,
    });
  }

  const chart = hindcast.slice(-6);
  const top = Math.max(1, ...chart.map((m) => (ignoreMemory ? m.blankError : m.memoryError)));
  const recent = hindcast.slice(-3);
  const average = (pick: (m: HindcastMonth) => number) => (recent.length ? recent.reduce((sum, m) => sum + pick(m), 0) / recent.length : 0);

  function explainMonth(month: HindcastMonth) {
    openWhy({
      title: `${monthLabel(month.month)} ${month.month.slice(0, 4)}, replayed from your history (hindcast)`,
      summary: 'Each forecast uses only what was known before the month began, then is scored against what really happened. A first-ever bill counts as a miss for both, because neither could have known.',
      rows: [
        ...month.lines.map((line) => ({
          label: line.name,
          value: `${line.predicted === null ? 'none' : usd(line.predicted)} → ${usd(line.actual)}`,
          note: `Forecast → actual.${line.daysOff !== null ? ` Date off by ${line.daysOff} ${line.daysOff === 1 ? 'day' : 'days'}.` : ''} No memory would have said ${line.blankPredicted === null ? 'nothing' : usd(line.blankPredicted)}.`,
        })),
        { label: 'Off by, with memory', value: usd(month.memoryError), total: true },
        { label: 'Off by, without memory', value: usd(month.blankError) },
      ],
      records: [],
    });
  }

  const openTrials = trials.filter((t) => t.status !== 'ended');
  const openPromises = promises.filter((p) => p.status === 'open');

  if (!hasMemories) {
    return (
      <div className="rounded-xl border border-secondary bg-primary p-2xl text-center shadow-xs">
        <h1 className="text-heading-xs font-semibold text-primary">Nothing to forecast yet</h1>
        <p className="text-sm text-secondary mt-xs">Scan your billing emails, and Kyvo will work out what to fund and when.</p>
        <Link href="/subscriptions" className="inline-block mt-md rounded-lg bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand">
          Go to scan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {!readOnly && <MemorySyncStatus />}

      {!readOnly && !telegram.linked && (
        <section className="rounded-xl border border-secondary bg-primary p-lg shadow-xs flex flex-wrap items-center justify-between gap-sm" aria-label="Telegram alerts">
          <p className="text-sm text-secondary">Get warned on Telegram before a charge can fail.</p>
          <a href={telegram.linkUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand shrink-0">
            Connect Telegram
          </a>
        </section>
      )}

      <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-sm mb-xs">
          <h2 className="text-xs uppercase font-semibold tracking-wider text-tertiary">Next funding</h2>
          <label className="flex items-center gap-xs text-xs font-medium text-secondary cursor-pointer">
            <input type="checkbox" checked={ignoreMemory} onChange={(event) => setIgnoreMemory(event.target.checked)} />
            Ignore memory
          </label>
        </div>

        {shownTotal > 0 ? (
          <div className="flex items-baseline flex-wrap gap-x-sm gap-y-xs">
            <p className="text-heading-md sm:text-heading-xl font-bold text-primary font-mono tracking-tight">
              Fund {usd(shownTotal)} by {shortDate(ignoreMemory ? blankBy : funding.fundBy)}
            </p>
            {local && <span className="text-secondary text-lg font-mono">{local}</span>}
            <button onClick={explainFunding} className="inline-flex items-center gap-xxs text-sm font-semibold text-brand-primary hover:underline focus-visible:ring-2 focus-visible:ring-focus-ring rounded">
              Why?
              <HelpCircle className="w-4 h-4 text-fg-brand-primary shrink-0" aria-hidden />
            </button>
          </div>
        ) : (
          <p className="text-heading-sm font-bold text-primary">Nothing to fund in the next 30 days</p>
        )}

        {ignoreMemory ? (
          <p className="text-sm text-utility-warning-700 mt-xs">
            With no memory, Kyvo would assume {blank.length} {blank.length === 1 ? 'bill' : 'bills'} repeat at their first price, including anything you&apos;ve stopped or had refunded, and it couldn&apos;t warn you about failed payments.
          </p>
        ) : (
          funding.items.length > 0 && (
            <p className="text-sm text-secondary mt-xs">
              Covers {funding.items.map((item) => `${item.name} on ${shortDate(item.nextDate)}`).join(', ')}, plus a safety buffer.
            </p>
          )
        )}

        {rate === null && currency !== 'USD' && <p className="text-xs text-utility-warning-700 mt-xs">Exchange rates are temporarily unavailable, so amounts are in dollars only.</p>}

        {!ignoreMemory &&
          alerts.map((alert) => (
            <div key={alert.slug} className={`mt-md p-md rounded-lg border flex items-start gap-sm ${alert.level === 'danger' ? 'bg-utility-error-50 border-utility-error-200' : 'bg-utility-warning-50 border-utility-warning-200'}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.level === 'danger' ? 'text-fg-error-primary' : 'text-fg-warning-primary'}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${alert.level === 'danger' ? 'text-utility-error-700' : 'text-utility-warning-700'}`}>
                  {alert.name}, {usd(alert.amount)} on {shortDate(alert.nextDate)}
                </p>
                <p className={`text-xs mt-xxs ${alert.level === 'danger' ? 'text-utility-error-700' : 'text-utility-warning-700'}`}>
                  {alert.message} {alert.rule}
                  {alert.declineFee ? ` ${alert.provider} charges ${alert.declineFee.currency === 'USD' ? usd(alert.declineFee.amount) : `${alert.declineFee.currency} ${alert.declineFee.amount}`} per decline.` : ''}
                </p>
              </div>
              {alert.basis.length > 0 && (
                <button
                  onClick={() =>
                    openWhy({
                      title: `${alert.name} failed payments`,
                      summary: alert.message,
                      records: alert.basis,
                    })
                  }
                  className="text-xs font-semibold underline shrink-0 text-primary"
                >
                  Why?
                </button>
              )}
            </div>
          ))}
      </section>

      <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs" aria-labelledby="accuracy-title">
        <h2 id="accuracy-title" className="text-heading-xs font-semibold text-primary">
          How far off the forecast was
        </h2>
        <p className="text-xs text-tertiary mt-xxs">
          <strong className="font-semibold">Hindcast:</strong> replayed from your own history, using only what was known before each month. These aren&apos;t live forecasts yet.
        </p>

        {chart.length >= 2 ? (
          <>
            <div className="mt-md flex items-end gap-xs sm:gap-md border-b border-secondary" role="img" aria-label={`Forecast error per month, ${ignoreMemory ? 'without' : 'with'} memory: ${chart.map((m) => `${monthLabel(m.month)} ${usd(ignoreMemory ? m.blankError : m.memoryError)}`).join(', ')}`}>
              {chart.map((month) => {
                const value = ignoreMemory ? month.blankError : month.memoryError;
                return (
                  <button key={month.month} onClick={() => explainMonth(month)} className="flex-1 min-w-0 flex flex-col items-center gap-xxs group focus-visible:ring-2 focus-visible:ring-focus-ring rounded" aria-label={`${monthLabel(month.month)}: off by ${usd(value)}. See why.`}>
                    <span className="text-xs font-mono text-tertiary group-hover:text-primary">{usd(value)}</span>
                    <span className="w-full max-w-[44px] h-28 flex items-end">
                      <span style={{ height: `${Math.max(value > 0 ? 4 : 1, (value / top) * 100)}%` }} className={`w-full rounded-t-md ${ignoreMemory ? 'bg-utility-warning-600' : 'bg-brand-solid'}`} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-xs sm:gap-md pt-xxs" aria-hidden>
              {chart.map((month) => (
                <span key={month.month} className="flex-1 min-w-0 text-center text-xs font-medium text-secondary">
                  {monthLabel(month.month)}
                </span>
              ))}
            </div>
            <p className="text-sm text-secondary mt-md">
              Last {recent.length} months, average error: <strong className="font-mono text-primary">{usd(average((m) => m.memoryError))}</strong> with memory, <strong className="font-mono text-primary">{usd(average((m) => m.blankError))}</strong> without. A first-ever bill counts as a miss for both. Tap a month for detail.
            </p>
          </>
        ) : (
          <p className="text-sm text-secondary mt-md">There isn&apos;t enough history for a comparison yet. It appears after two months of bills.</p>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <VaultCard address={vault.address} runway={vault.runway} unavailable={vault.unavailable} rate={rate} currency={currency} readOnly={readOnly} />
        {telegram.linked && <TelegramCard linked linkUrl={telegram.linkUrl} />}
        <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs" aria-labelledby="trials-title">
          <div className="flex items-center justify-between">
            <h2 id="trials-title" className="text-sm font-semibold text-primary">
              Trials
            </h2>
            <Link href="/trials" className="text-xs font-medium text-brand-primary hover:underline flex items-center">
              All <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {openTrials.length === 0 ? (
            <p className="text-sm text-tertiary mt-xs">No trials running.</p>
          ) : (
            <ul className="mt-xs space-y-xs">
              {openTrials.slice(0, 3).map((trial) => (
                <li key={trial.slug} className="flex items-center justify-between gap-sm text-sm">
                  <span className="text-primary truncate">{trial.name}</span>
                  <span className={`shrink-0 text-xs font-medium ${trial.status === 'unknown' ? 'text-utility-warning-700' : 'text-secondary'}`}>{trial.status === 'unknown' ? 'End date needed' : `Ends ${shortDate(trial.endsAt)}, ${trial.daysLeft} days`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs" aria-labelledby="promises-title">
          <div className="flex items-center justify-between">
            <h2 id="promises-title" className="text-sm font-semibold text-primary">
              You said you would
            </h2>
            <Link href="/trials" className="text-xs font-medium text-brand-primary hover:underline flex items-center">
              All <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {openPromises.length === 0 ? (
            <p className="text-sm text-tertiary mt-xs">No open promises.</p>
          ) : (
            <ul className="mt-xs space-y-xs">
              {openPromises.slice(0, 3).map((promise) => (
                <li key={promise.id} className="text-sm text-primary">
                  {promise.text}
                  {promise.resurface && <span className="text-xs text-utility-warning-700"> ({promise.ageDays} days ago)</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
