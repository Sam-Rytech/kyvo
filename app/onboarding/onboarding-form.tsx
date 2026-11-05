'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CURRENCIES, PROVIDERS } from '@/config/providers';
import { ScanPanel } from '@/components/scan-panel';

export function OnboardingForm({ initialCurrency, initialProviders }: { initialCurrency: string; initialProviders: string[] }) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [providers, setProviders] = useState<string[]>(initialProviders);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const toggle = (name: string) => setProviders((current) => (current.includes(name) ? current.filter((p) => p !== name) : [...current, name]));

  async function start() {
    setSaving(true);
    setError(null);
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ homeCurrency: currency, providers }),
    }).catch(() => null);
    setSaving(false);
    if (response?.ok) setStarted(true);
    else setError('Couldn\'t save that. Check your connection and try again.');
  }

  if (started) {
    return (
      <div className="space-y-md">
        <ScanPanel autoStart label="Keep scanning" />
        <Link href="/subscriptions" className="inline-block text-sm font-semibold text-brand-primary hover:underline">
          See your subscriptions
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl">
      <label className="block space-y-xs">
        <span className="text-sm font-semibold text-primary">What currency do you fund your cards from?</span>
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className="block w-full rounded-lg border border-secondary bg-primary px-md py-sm text-md text-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-xs">
        <legend className="text-sm font-semibold text-primary">Which cards pay your subscriptions?</legend>
        <p className="text-xs text-tertiary">Kyvo applies each provider&apos;s fee and decline rules. Never enter card numbers.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs pt-xs">
          {PROVIDERS.map((provider) => (
            <label key={provider.id} className="flex items-center gap-sm rounded-lg border border-secondary px-md py-sm text-sm text-primary cursor-pointer hover:bg-secondary-hover">
              <input type="checkbox" checked={providers.includes(provider.name)} onChange={() => toggle(provider.name)} />
              {provider.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-xs">
        <button
          onClick={() => void start()}
          disabled={saving || providers.length === 0}
          className="w-full rounded-lg bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {saving ? 'Saving…' : 'Scan my billing emails'}
        </button>
        <p className="text-xs text-tertiary">
          Kyvo only searches for billing mail. Email text goes to Groq to pull out the facts, and is never stored. Only those facts are kept, encrypted on Walrus.
        </p>
        {error && <p className="text-sm text-utility-error-700">{error}</p>}
      </div>
    </div>
  );
}
