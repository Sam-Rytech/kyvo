'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MemorySyncStatus } from '@/components/memory-sync';
import { TelegramCard } from '@/components/telegram-card';
import { VaultCard } from '@/components/vault-card';
import { useWhy, type WhyContent, type WhyRecord } from '@/components/why-panel';
import type { GuardAlert } from '@/lib/engines/decline-guard';
import type { BlankForecast, Funding } from '@/lib/engines/forecast';
import { fundingHeadline, fundingStatus } from '@/lib/engines/funding-status';
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
  asOf: string;
  hasMemories: boolean;
  vault: { address: string | null; runway: VaultRunway | null; unavailable: boolean };
  telegram: { linked: boolean; linkUrl: string };
  readOnly: boolean;
};

const STATUS_WORDS = { covered: 'Covered', soon: 'Fund soon', risk: 'At risk', ignored: 'Memory ignored' };

type Row = { key: string; date: string | null; label: string; right: string; warning?: string; why?: WhyContent };

export function DashboardView({ funding, blank, hindcast, alerts, trials, promises, rate, rateSource, currency, asOf, hasMemories, vault, telegram, readOnly }: Props) {
  const { openWhy } = useWhy();
  const [ignoreMemory, setIgnoreMemory] = useState(false);

  const blankTotal = blank.reduce((sum, b) => sum + b.amount, 0);
  const status = fundingStatus(funding, alerts);
  const shownStatus = ignoreMemory ? 'ignored' : status;
  const local = approxLocal(funding.total, rate, currency, funding.markup);
  const records: WhyRecord[] = funding.items.flatMap((item) => item.basis.map((b) => ({ sentence: b.sentence, blobId: b.blobId })));

  function explainFunding() {
    if (ignoreMemory) {
      openWhy({
        title: 'With memory ignored',
        summary: 'Without memory, a forecast can only assume the first price ever seen repeats every month: no fees, no refunds, and nothing ever cancelled.',
        rows: [...blank.map((b) => ({ label: b.name, value: usd(b.amount), note: shortDate(b.nextDate) })), { label: 'TOTAL', value: usd(blankTotal), total: true }],
        records: [],
      });
      return;
    }
    const notes: string[] = [];
    if (funding.unknownFees.length) notes.push(`No card fee is included for ${funding.items.filter((i) => i.fee === null).map((i) => i.name).join(', ')}, because it couldn't be confirmed. The buffer helps cover this.`);
    if (funding.unknownBalanceCards.length) notes.push(`Nothing is taken off for what's already on your card, because Kyvo doesn't know the balance.`);
    if (local) notes.push("Your provider's rate will differ, so the local amount is approximate.");
    openWhy({
      title: `Fund by ${shortDate(funding.fundBy).toUpperCase()}`,
      summary: "Worked out from your own billing history for the next 30 days, two days early so the charge can't catch you short.",
      rows: [
        ...funding.items.map((item) => ({
          label: item.name,
          value: item.amount.toFixed(2),
          note: `${shortDate(item.nextDate)}, every ${item.intervalDays} days, ${item.usage ? 'median of recent bills' : `from ${item.basis.length} past ${item.basis.length === 1 ? 'charge' : 'charges'}`}${item.confidence === 'low' ? ', low confidence' : ''}`,
        })),
        ...(funding.feesTotal > 0 ? [{ label: 'Card fees', value: `+${funding.feesTotal.toFixed(2)}` }] : []),
        { label: 'Safety buffer', value: `+${funding.buffer.toFixed(2)}`, note: '5%, at least $1' },
        ...(funding.knownBalance > 0 ? [{ label: 'Already on your cards', value: `-${funding.knownBalance.toFixed(2)}` }] : []),
        { label: 'TO FUND (USD)', value: funding.total.toFixed(2), total: true },
        ...(local && rate !== null
          ? [
              { label: `Rate from Tatum${rateSource ? ` (${rateSource})` : ''}`, value: rate.toLocaleString('en-US', { maximumFractionDigits: 2 }), small: true },
              ...(funding.markup > 0 ? [{ label: 'Card provider above market', value: `+${(funding.markup * 100).toFixed(2)}%`, small: true }] : []),
              { label: 'Local amount', value: local, grand: true },
            ]
          : []),
      ],
      notes,
      records,
    });
  }

  const chart = hindcast.slice(-6);
  const top = Math.max(1, ...chart.flatMap((m) => [m.memoryError, m.blankError]));
  const recent = hindcast.slice(-3);
  const average = (pick: (m: HindcastMonth) => number) => (recent.length ? recent.reduce((sum, m) => sum + pick(m), 0) / recent.length : 0);

  function explainMonth(month: HindcastMonth) {
    openWhy({
      title: `${monthLabel(month.month)} ${month.month.slice(0, 4)} hindcast`.toUpperCase(),
      summary: 'Each forecast uses only what was known before the month began, then is scored against what really happened. A first-ever bill counts as a miss for both.',
      rows: [
        ...month.lines.map((line) => ({
          label: line.name,
          value: `${line.predicted === null ? 'none' : line.predicted.toFixed(2)} > ${line.actual.toFixed(2)}`,
          note: `Forecast > actual.${line.daysOff !== null ? ` Date off by ${line.daysOff} ${line.daysOff === 1 ? 'day' : 'days'}.` : ''} No memory: ${line.blankPredicted === null ? 'nothing' : usd(line.blankPredicted)}.`,
        })),
        { label: 'OFF BY, WITH MEMORY', value: usd(month.memoryError), total: true },
        { label: 'Off by, without memory', value: usd(month.blankError), small: true },
      ],
      records: [],
    });
  }

  if (!hasMemories) {
    return (
      <div className="space-y-md py-xl">
        <h1 className="page-title">Nothing to forecast yet</h1>
        <p className="text-md text-secondary max-w-prose">Scan your billing emails, and Kyvo will work out what to fund and when.</p>
        <Link href="/subscriptions" className="inline-block rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand">
          Scan your billing emails
        </Link>
      </div>
    );
  }

  const alertFor = (name: string) => alerts.find((alert) => alert.name === name);
  const alertWhy = (alert: GuardAlert): WhyContent | undefined => (alert.basis.length ? { title: `${alert.name} failed payments`.toUpperCase(), summary: alert.message, records: alert.basis } : undefined);
  const alertText = (alert: GuardAlert) =>
    [alert.message, alert.rule, alert.declineFee ? `${alert.provider} charges ${alert.declineFee.currency === 'USD' ? usd(alert.declineFee.amount) : `${alert.declineFee.currency} ${alert.declineFee.amount}`} per decline.` : null].filter(Boolean).join(' ');

  const rows: Row[] = ignoreMemory
    ? blank.map((b) => ({ key: b.name, date: b.nextDate, label: b.name, right: usd(b.amount) }))
    : [
        ...funding.items.map((item) => {
          const alert = alertFor(item.name);
          return { key: item.slug, date: item.nextDate, label: item.name, right: usd(item.amount), warning: alert ? alertText(alert) : undefined, why: alert ? alertWhy(alert) : undefined };
        }),
        ...alerts.filter((alert) => !funding.items.some((item) => item.name === alert.name)).map((alert) => ({ key: alert.slug, date: alert.nextDate, label: alert.name, right: usd(alert.amount), warning: alertText(alert), why: alertWhy(alert) })),
        ...trials.filter((trial) => trial.status !== 'ended').map((trial) => ({ key: `trial-${trial.slug}`, date: trial.endsAt, label: trial.status === 'unknown' ? `${trial.name} trial` : `${trial.name} trial ends`, right: trial.convertsTo ? `then ${usd(trial.convertsTo)}` : 'Trial', warning: trial.status === 'unknown' ? 'End date needed. Add it on Trials.' : undefined })),
      ].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));

  const openPromises = promises.filter((p) => p.status === 'open');
  const topAlert = alerts.find((alert) => alert.level === 'danger') ?? alerts.find((alert) => alert.message);
  const headline = ignoreMemory ? (blankTotal > 0 ? `${usd(blankTotal)} without memory` : 'No forecast without memory') : fundingHeadline({ funding, status, rate, currency, asOf });

  return (
    <div className="space-y-xl band-wrap">
      <section className="band" data-status={shownStatus} aria-labelledby="funding-sentence">
        {readOnly && <p className="text-sm font-medium max-w-prose">Kyvo reads your billing emails and tells you what to fund before a dollar charge fails. This is a live demo from one person&apos;s real billing history, read-only.</p>}

        <div className="flex flex-wrap items-center justify-between gap-sm">
          <p className="text-sm font-bold">{STATUS_WORDS[shownStatus]}</p>
          <label className="flex items-center gap-xs text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={ignoreMemory} onChange={(event) => setIgnoreMemory(event.target.checked)} className="w-4 h-4" />
            Ignore memory
          </label>
        </div>

        <h1 id="funding-sentence" className="display band-sentence">
          {headline}
        </h1>

        {ignoreMemory ? (
          <p className="text-lg font-medium max-w-2xl">With no memory, Kyvo would assume {blank.length} {blank.length === 1 ? 'bill repeats' : 'bills repeat'} at the first price it saw, including anything stopped or refunded, and it couldn&apos;t warn you about failed payments.</p>
        ) : (
          funding.total > 0 && (
            <p className="text-lg font-medium max-w-2xl">
              {local ? `That's ${usd(funding.total)}. ` : ''}Covers {funding.items.map((item) => `${item.name} on ${shortDate(item.nextDate)}`).join(', ')}, plus a safety buffer.
              {topAlert?.message ? ` ${topAlert.message}` : ''}
            </p>
          )
        )}

        {rate === null && currency !== 'USD' && <p className="text-sm font-medium">Exchange rates are unavailable right now, so amounts are in dollars.</p>}

        {(ignoreMemory ? blank.length > 0 : funding.total > 0) && (
          <button onClick={explainFunding} className="justify-self-start rounded-full px-lg py-sm text-sm font-semibold" style={{ background: 'var(--band-btn-bg)', color: 'var(--band-btn-fg)' }}>
            Why this amount?
          </button>
        )}
      </section>

      {!readOnly && <MemorySyncStatus />}

      {!readOnly && !telegram.linked && (
        <section className="flex flex-wrap items-center justify-between gap-sm border-b border-secondary pb-lg" aria-label="Telegram alerts">
          <p className="text-md font-medium text-primary">Get warned on Telegram before a charge can fail.</p>
          <a href={telegram.linkUrl} target="_blank" rel="noreferrer" className="rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shrink-0">
            Connect Telegram
          </a>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
        <section aria-labelledby="coming-up" className="min-w-0">
          <h2 id="coming-up" className="section-title mb-sm">
            Coming up
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-secondary border-t border-secondary pt-sm">Nothing in the next 30 days.</p>
          ) : (
            <ul>
              {rows.map((row) => (
                <li key={row.key} className="grid grid-cols-[4rem_1fr_auto] gap-sm py-sm border-t border-secondary items-baseline">
                  <span className="text-sm text-tertiary">{row.date ? shortDate(row.date) : 'No date'}</span>
                  <div className="min-w-0">
                    <p className="text-md font-medium text-primary">{row.label}</p>
                    {row.warning && <p className="text-sm font-medium text-[#a81f17] mt-xxs">{row.warning}</p>}
                    {row.why && (
                      <button onClick={() => openWhy(row.why as WhyContent)} className="text-sm font-semibold underline mt-xxs">
                        Why?
                      </button>
                    )}
                  </div>
                  <span className="text-md font-bold tabular-nums whitespace-nowrap">{row.right}</span>
                </li>
              ))}
            </ul>
          )}

          {!ignoreMemory && openPromises.length > 0 && (
            <div className="mt-lg">
              <h3 className="text-md font-bold mb-xs">You said you would</h3>
              <ul className="space-y-xs">
                {openPromises.slice(0, 3).map((promise) => (
                  <li key={promise.id} className="text-md text-primary">
                    {promise.text}
                    {promise.resurface && <span className="text-sm text-tertiary"> ({promise.ageDays === 1 ? '1 day' : `${promise.ageDays} days`} ago)</span>}
                  </li>
                ))}
              </ul>
              <Link href="/trials" className="inline-block text-sm font-semibold underline mt-xs">
                See all
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="accuracy-title" className="min-w-0">
          <h2 id="accuracy-title" className="section-title mb-sm">
            How close the forecast got
          </h2>
          {chart.length >= 2 ? (
            <>
              <div className="flex items-end gap-xs sm:gap-md border-b border-primary" role="img" aria-label={`Forecast error per month, with and without memory: ${chart.map((m) => `${monthLabel(m.month)} ${usd(m.memoryError)} with, ${usd(m.blankError)} without`).join('; ')}`}>
                {chart.map((month) => (
                  <button key={month.month} onClick={() => explainMonth(month)} aria-label={`${monthLabel(month.month)}: off by ${usd(month.memoryError)} with memory, ${usd(month.blankError)} without. See why.`} className="flex-1 min-w-0 flex items-end gap-[3px] h-36">
                    <span className="flex-1 bg-brand-solid rounded-t-sm" style={{ height: `${Math.max(month.memoryError > 0 ? 3 : 1, (month.memoryError / top) * 100)}%` }} />
                    <span className="flex-1 rounded-t-sm border border-b-0 border-brand" style={{ background: 'var(--marigold)', height: `${Math.max(month.blankError > 0 ? 3 : 1, (month.blankError / top) * 100)}%` }} />
                  </button>
                ))}
              </div>
              <div className="flex gap-xs sm:gap-md pt-xxs" aria-hidden>
                {chart.map((month) => (
                  <span key={month.month} className="flex-1 min-w-0 text-center text-sm text-secondary">
                    {monthLabel(month.month)}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-md text-sm text-secondary mt-xs" aria-hidden>
                <span className="flex items-center gap-xxs">
                  <i className="w-3 h-3 rounded-sm bg-brand-solid" /> With memory
                </span>
                <span className="flex items-center gap-xxs">
                  <i className="w-3 h-3 rounded-sm border border-brand" style={{ background: 'var(--marigold)' }} /> Without
                </span>
              </div>
              <p className="text-md text-primary mt-md">
                Last {recent.length} months, off by <strong className="tabular-nums">{usd(average((m) => m.memoryError))}</strong> on average with memory, and <strong className="tabular-nums">{usd(average((m) => m.blankError))}</strong> without.
              </p>
              <p className="text-sm text-tertiary mt-xxs">Hindcast, replayed from your own emails. Select a month for detail.</p>
            </>
          ) : (
            <p className="text-sm text-secondary border-t border-secondary pt-sm">This appears after two months of bills.</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
        <VaultCard address={vault.address} runway={vault.runway} unavailable={vault.unavailable} rate={rate} currency={currency} readOnly={readOnly} />
        {telegram.linked && <TelegramCard linked linkUrl={telegram.linkUrl} />}
      </div>
    </div>
  );
}
