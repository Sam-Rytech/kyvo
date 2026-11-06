'use client';

import { useState } from 'react';
import { useMemorySync } from '@/components/memory-sync';
import { CURRENCIES, PROVIDERS } from '@/config/providers';

const LISTED = PROVIDERS.map((p) => p.name);

export function SettingsForm({ currency, providers }: { currency: string; providers: string[] }) {
  const { sync } = useMemorySync();
  const [homeCurrency, setHomeCurrency] = useState(currency);
  const [chosen, setChosen] = useState(providers.filter((p) => LISTED.includes(p)));
  const [other, setOther] = useState(providers.filter((p) => !LISTED.includes(p)).join(', '));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const toggle = (name: string) => setChosen((list) => (list.includes(name) ? list.filter((p) => p !== name) : [...list, name]));
  const extra = other.split(',').map((p) => p.trim()).filter(Boolean);
  const all = [...chosen, ...extra];

  async function save() {
    setStatus('saving');
    const response = await fetch('/api/onboarding', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ homeCurrency, providers: all }) }).catch(() => null);
    setStatus(response?.ok ? 'saved' : 'error');
    if (response?.ok) void sync();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="border-t border-secondary pt-lg space-y-lg"
    >
      <label className="block space-y-xs">
        <span className="text-sm font-semibold text-primary">Home currency</span>
        <select value={homeCurrency} onChange={(event) => setHomeCurrency(event.target.value)} className="block w-full rounded-lg border border-secondary bg-primary px-md py-sm text-md text-primary">
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <span className="block text-xs text-tertiary">Bills in your home currency are left out, because Kyvo tracks foreign-currency bills.</span>
      </label>

      <fieldset className="space-y-xs">
        <legend className="text-sm font-semibold text-primary">Which cards pay your subscriptions?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs">
          {PROVIDERS.map((provider) => (
            <label key={provider.id} className="flex items-center gap-sm rounded-lg border border-secondary px-md py-sm text-sm text-primary cursor-pointer">
              <input type="checkbox" checked={chosen.includes(provider.name)} onChange={() => toggle(provider.name)} />
              {provider.name}
            </label>
          ))}
        </div>
        <label className="block text-xs font-medium text-secondary pt-xs">
          Not listed? Name it here, separated by commas
          <input value={other} onChange={(event) => setOther(event.target.value)} maxLength={200} className="block w-full mt-xxs rounded-lg border border-secondary bg-primary px-sm py-xs text-sm text-primary" />
        </label>
        <p className="text-xs text-tertiary">Kyvo still forecasts for a provider it doesn&apos;t know. It just won&apos;t state fees or rules it can&apos;t confirm.</p>
      </fieldset>

      <div className="flex items-center gap-sm">
        <button disabled={all.length === 0 || status === 'saving'} className="rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand disabled:opacity-50">
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <p role="status" className="text-xs text-secondary">
          {status === 'saved' && 'Saved. Saving to Walrus Memory…'}
          {status === 'error' && <span className="text-utility-error-700">That didn&apos;t save. Try again.</span>}
        </p>
      </div>
    </form>
  );
}
