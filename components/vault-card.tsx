'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMemorySync } from '@/components/memory-sync';
import { useWhy } from '@/components/why-panel';
import type { VaultRunway } from '@/lib/engines/vault';
import { approxLocal, usd } from '@/lib/format';

// Wallets are only detectable in the browser, so this never runs on the server.
const WalletPicker = dynamic(() => import('@/components/wallet-picker'), { ssr: false, loading: () => <p className="text-xs text-tertiary">Looking for wallets…</p> });

type Props = {
  address: string | null;
  runway: VaultRunway | null;
  /** The chain couldn't be read, which isn't the same as an empty vault */
  unavailable: boolean;
  rate: number | null;
  currency: string;
};

export function VaultCard({ address, runway, unavailable, rate, currency }: Props) {
  const { openWhy } = useWhy();
  const { sync } = useMemorySync();
  const [pasted, setPasted] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [changing, setChanging] = useState(false);

  async function save(value: string) {
    setSaving(true);
    setError(null);
    const response = await fetch('/api/vault', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: value }) }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setSaving(false);
    if (response?.ok) {
      setSaved(true);
      window.location.reload();
      void sync();
    } else setError(body?.error ?? "That didn't save. Check your connection and try again.");
  }

  const local = runway ? approxLocal(runway.balance, rate, currency) : null;

  return (
    <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-sm" aria-labelledby="vault-title">
      <h2 id="vault-title" className="text-sm font-semibold text-primary">
        USDC vault
      </h2>

      {address && unavailable && <p className="text-sm text-utility-warning-700">Chain data is temporarily unavailable, so the balance is hidden.</p>}

      {address && runway && (
        <>
          <p className="text-heading-sm font-mono font-bold text-primary">
            {usd(runway.balance)} <span className="text-xs font-sans font-normal text-tertiary">USDC on Sui</span>
          </p>
          {local && <p className="text-xs font-mono text-tertiary">{local}</p>}
          <button
            onClick={() =>
              openWhy({
                title: 'Months of runway',
                summary: 'Your vault balance, read live from Sui through Tatum, divided by what is really still billing each month. Stopped and refunded bills are left out.',
                rows: [
                  { label: 'Vault balance', value: usd(runway.balance) },
                  { label: 'Monthly bills', value: usd(runway.monthlyBurn) },
                  { label: 'Runway', value: runway.months === null ? 'No active bills' : `${runway.months} months`, total: true },
                ],
                records: [],
              })
            }
            className="text-sm text-secondary underline decoration-dotted underline-offset-2"
          >
            {runway.months === null ? 'No active bills, so no runway to show' : `${runway.months} months of runway at ${usd(runway.monthlyBurn)} a month`}
          </button>
          <p className="text-xs text-tertiary">
            <a href={`https://suiscan.xyz/mainnet/account/${address}`} target="_blank" rel="noreferrer" className="font-mono underline">
              {address.slice(0, 8)}…{address.slice(-6)}
            </a>
            {' · '}
            <button onClick={() => setChanging((open) => !open)} className="underline">
              Change
            </button>
          </p>
        </>
      )}

      {(!address || changing) && (
        <div className="space-y-xs">
          <p className="text-xs text-tertiary">Kyvo only reads your vault. It can&apos;t move your money, and it never asks for your seed phrase.</p>
          <WalletPicker onAddress={(value) => void save(value)} saving={saving} />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save(pasted);
            }}
            className="flex gap-xs"
          >
            <label className="sr-only" htmlFor="vault-address">
              Or paste your Sui address
            </label>
            <input id="vault-address" value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder="Or paste your Sui address (0x…)" className="flex-1 min-w-0 rounded-lg border border-secondary bg-primary px-sm py-xs text-sm font-mono text-primary placeholder:text-placeholder" />
            <button disabled={!pasted.trim() || saving} className="rounded-lg border border-secondary bg-primary px-md py-xs text-sm font-semibold text-secondary disabled:opacity-50 shrink-0">
              Save
            </button>
          </form>
        </div>
      )}
      {saved && <p className="text-xs text-secondary">Saved.</p>}
      {error && <p className="text-xs text-utility-error-700">{error}</p>}
    </section>
  );
}
