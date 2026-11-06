'use client';

import { useState } from 'react';
import { MemorySyncStatus, useMemorySync } from '@/components/memory-sync';
import { useWhy } from '@/components/why-panel';
import { getProviderRule, PROVIDERS, RULES_CHECKED } from '@/config/providers';
import type { CardState } from '@/lib/engines/registry';
import { shortDate, usd } from '@/lib/format';

async function saveCard(body: unknown) {
  const response = await fetch('/api/cards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return response?.ok ?? false;
}

function ProviderFacts({ provider }: { provider: string }) {
  const rule = getProviderRule(provider);
  if (!rule) return null;
  const facts = [
    rule.declineFee ? `Decline fee: ${rule.declineFee.currency === 'USD' ? usd(rule.declineFee.amount) : `${rule.declineFee.currency} ${rule.declineFee.amount}`}.` : null,
    rule.txnFee ? `Per payment: ${usd(rule.txnFee.flatUsd ?? 0)}.` : null,
    rule.termination?.note ?? null,
  ].filter(Boolean);
  const measured = rule.fundingMarkup ? `Local amounts run about ${(rule.fundingMarkup * 100).toFixed(2)}% above the market rate, measured from a real payment.` : null;
  if (!facts.length && !measured) return null;
  return (
    <div className="text-sm text-tertiary space-y-xxs">
      {facts.length > 0 && <p>{facts.join(' ')}</p>}
      {measured && <p>{measured}</p>}
      {facts.length > 0 && rule.sources.length > 0 && (
        <p>
          Checked {shortDate(RULES_CHECKED)}:{' '}
          {rule.sources.map((source, i) => (
            <a key={source} href={source} target="_blank" rel="noreferrer" className="underline">
              source {i + 1}{' '}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}

function CardRow({ card, onSaved, readOnly }: { card: CardState; onSaved: () => void; readOnly: boolean }) {
  const { openWhy } = useWhy();
  const [provider, setProvider] = useState(card.provider ?? '');
  const [balance, setBalance] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const stale = card.holders.filter((h) => h.stale);

  async function save() {
    setStatus('saving');
    const amount = balance === '' ? undefined : Number(balance);
    const ok = await saveCard({ card: card.card, provider: provider && provider !== card.provider ? provider : undefined, balance: amount });
    setStatus(ok ? 'saved' : 'error');
    if (ok) {
      setBalance('');
      onSaved();
    }
  }

  const changed = (provider && provider !== card.provider) || balance !== '';
  const validBalance = balance === '' || (Number.isFinite(Number(balance)) && Number(balance) >= 0);

  return (
    <li className="border-t border-secondary py-lg space-y-md">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <h3 className="text-lg font-semibold text-primary">{/^\d{4}$/.test(card.card) ? `Card ending ${card.card}` : card.card}</h3>
          <p className="text-xs text-tertiary">{card.provider ?? 'Provider not set'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-tertiary">Balance</p>
          <p className="text-lg font-bold tabular-nums text-primary">{card.balance === null ? 'Unknown' : usd(card.balance)}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-primary">
          {card.holders.length} {card.holders.length === 1 ? 'service holds' : 'services hold'} this card{stale.length ? `, ${stale.length} unused for over 60 days` : ''}
        </p>
        <ul className="mt-xs flex flex-wrap gap-xs">
          {card.holders.map((holder) => (
            <li key={holder.slug}>
              <button
                onClick={() => openWhy({ title: `${holder.name} holds this card`.toUpperCase(), summary: `Last seen ${shortDate(holder.lastSeen)}.`, records: holder.blobIds.map((blobId) => ({ blobId, sentence: `${holder.name} used this card.` })) })}
                className={`rounded-md border px-sm py-xxs text-xs ${holder.stale ? 'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700' : 'border-secondary bg-secondary text-secondary'}`}
              >
                {holder.name}
                {holder.stale ? `, unused since ${shortDate(holder.lastSeen)}` : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {card.provider && <ProviderFacts provider={card.provider} />}

      {!readOnly && <div className="flex flex-wrap items-end gap-xs border-t border-secondary pt-md">
        <label className="text-xs font-medium text-secondary">
          Issued by
          <input list="known-providers" value={provider} onChange={(event) => setProvider(event.target.value)} maxLength={40} placeholder="Type or choose" className="block mt-xxs w-40 rounded-lg border border-secondary bg-primary px-sm py-xs text-sm text-primary placeholder:text-placeholder" />
          <datalist id="known-providers">
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </label>
        <label className="text-xs font-medium text-secondary">
          Balance now, in dollars (typed by you, as card providers have no API)
          <input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" className="block mt-xxs w-28 rounded-lg border border-secondary bg-primary px-sm py-xs text-sm text-primary placeholder:text-placeholder" />
        </label>
        <button onClick={() => void save()} disabled={!changed || !validBalance || status === 'saving'} className="rounded-full bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand disabled:opacity-50">
          Save
        </button>
        {status === 'saved' && <span className="text-xs text-secondary">Saved. Updating from Walrus Memory…</span>}
        {status === 'error' && <span className="text-xs text-utility-error-700">That didn&apos;t save. Try again.</span>}
      </div>}
    </li>
  );
}

export function CardsView({ cards, readOnly }: { cards: CardState[]; readOnly: boolean }) {
  const { open, sync } = useMemorySync();
  const total = cards.reduce((sum, card) => sum + card.holders.length, 0);

  return (
    <section id="cards" className="space-y-sm scroll-mt-20" aria-labelledby="cards-title">
      {!readOnly && <MemorySyncStatus />}
      <div>
        <h2 id="cards-title" className="page-title">
          Cards
        </h2>
        <p className="text-md text-secondary mt-xs">{cards.length === 0 ? 'No cards found in your emails yet.' : `${total} ${total === 1 ? 'service holds' : 'services hold'} your cards.`}</p>
      </div>
      {open > 0 && <p className="text-xs text-tertiary">Saving to Walrus Memory…</p>}
      <ul className="space-y-md">
        {cards.map((card) => (
          <CardRow key={card.card} card={card} onSaved={() => void sync()} readOnly={readOnly} />
        ))}
      </ul>
    </section>
  );
}
