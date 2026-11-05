'use client';

import { useState } from 'react';
import { MemorySyncStatus, useMemorySync } from '@/components/memory-sync';
import type { PromiseState } from '@/lib/engines/promises';
import type { TrialState } from '@/lib/engines/trials';
import { shortDate, usd } from '@/lib/format';

async function post(path: string, body: unknown) {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return response?.ok ?? false;
}

const FAILED = "That didn't save. Check your connection and try again.";

function TrialCard({ trial, onSaved, readOnly }: { trial: TrialState; onSaved: () => void; readOnly: boolean }) {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function confirm() {
    setStatus('saving');
    const ok = await post('/api/trials', { name: trial.name, startedOn: trial.startedOn, endsAt: date });
    setStatus(ok ? 'saved' : 'error');
    if (ok) onSaved();
  }

  const soon = trial.status === 'active' && (trial.daysLeft as number) <= 3;
  return (
    <li className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xs">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <h3 className="text-sm font-bold text-primary">{trial.name}</h3>
        {trial.status === 'active' && <span className={`rounded-full border px-md py-xxs text-xs font-semibold ${soon ? 'bg-utility-error-50 text-utility-error-700 border-utility-error-200' : 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200'}`}>{trial.daysLeft === 1 ? '1 day left' : `${trial.daysLeft} days left`}</span>}
        {trial.status === 'ended' && <span className="rounded-full border border-utility-gray-200 bg-utility-gray-50 px-md py-xxs text-xs font-medium text-utility-gray-700">{trial.converted ? 'Became a paid plan' : 'Ended'}</span>}
        {trial.status === 'unknown' && <span className="rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">End date needed</span>}
      </div>
      <p className="text-xs text-tertiary">
        Started {shortDate(trial.startedOn)}
        {trial.endsAt ? `, ends ${shortDate(trial.endsAt)}` : ''}
        {trial.convertsTo ? `, then ${usd(trial.convertsTo)}` : ''}
      </p>
      {trial.reason && <p className="text-xs text-secondary italic">Why you started it: {trial.reason}</p>}
      {!readOnly && trial.status === 'unknown' && status !== 'saved' && (
        <div className="flex flex-wrap items-end gap-xs pt-xs">
          <label className="text-xs font-medium text-secondary">
            When does it end?
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="block mt-xxs rounded-lg border border-secondary bg-primary px-sm py-xs text-sm text-primary" />
          </label>
          <button onClick={() => void confirm()} disabled={!date || status === 'saving'} className="rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand disabled:opacity-50">
            Save
          </button>
        </div>
      )}
      {status === 'saved' && <p className="text-xs text-secondary">Saved. Updating from Walrus Memory…</p>}
      {status === 'error' && <p className="text-xs text-utility-error-700">{FAILED}</p>}
    </li>
  );
}

export function TrialsView({ trials, promises, readOnly }: { trials: TrialState[]; promises: PromiseState[]; readOnly: boolean }) {
  const { open, sync } = useMemorySync();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  async function addPromise() {
    setError(null);
    if (await post('/api/promises', { text })) {
      setSaved((list) => [...list, text]);
      setText('');
      void sync();
    } else setError(FAILED);
  }

  async function resolve(promise: PromiseState) {
    setError(null);
    if (await post('/api/promises', { id: promise.id, text: promise.text, done: true })) {
      setSaved((list) => [...list, promise.id]);
      void sync();
    } else setError(FAILED);
  }

  return (
    <div className="space-y-xl">
      {!readOnly && <MemorySyncStatus />}
      <div>
        <h1 className="text-heading-xs font-semibold text-primary">Trials and promises</h1>
        <p className="text-xs text-tertiary">Found in your billing emails, or things you told Kyvo.</p>
      </div>
      {open > 0 && <p className="text-xs text-tertiary">Saving to Walrus Memory…</p>}

      <section aria-labelledby="promises-heading" className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-sm">
        <h2 id="promises-heading" className="text-sm font-semibold text-primary">
          You said you would
        </h2>
        {promises.length === 0 && <p className="text-sm text-tertiary">Nothing yet. Tell Kyvo what you plan to cancel, and it&apos;ll keep reminding you.</p>}
        <ul className="space-y-xs">
          {promises.map((promise) => (
            <li key={promise.id} className="flex items-start justify-between gap-sm text-sm">
              <span className={promise.status === 'done' ? 'text-tertiary line-through' : 'text-primary'}>
                {promise.text}
                {promise.status === 'open' && <span className="block text-xs text-tertiary">{promise.ageDays === 0 ? 'Today' : `${promise.ageDays} days ago`}</span>}
              </span>
              {!readOnly &&
                promise.status === 'open' &&
                (saved.includes(promise.id) ? (
                  <span className="text-xs text-tertiary shrink-0">Saving…</span>
                ) : (
                  <button onClick={() => void resolve(promise)} className="text-xs font-semibold text-brand-primary hover:underline shrink-0">
                    Done
                  </button>
                ))}
            </li>
          ))}
          {saved.filter((item) => !promises.some((p) => p.id === item)).map((item) => (
            <li key={item} className="text-sm text-tertiary">
              {item} (saving…)
            </li>
          ))}
        </ul>
        {!readOnly && <form
          onSubmit={(event) => {
            event.preventDefault();
            void addPromise();
          }}
          className="flex gap-xs pt-xs"
        >
          <label className="sr-only" htmlFor="promise-text">
            What do you plan to do?
          </label>
          <input id="promise-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder="Cancel Canva before it renews" className="flex-1 min-w-0 rounded-lg border border-secondary bg-primary px-md py-xs text-sm text-primary placeholder:text-placeholder" />
          <button disabled={text.trim().length < 3} className="rounded-lg bg-brand-solid px-md py-xs text-sm font-semibold text-primary-on-brand disabled:opacity-50 shrink-0">
            Add
          </button>
        </form>}
        {error && <p className="text-xs text-utility-error-700">{error}</p>}
      </section>

      <section aria-labelledby="trials-heading" className="space-y-sm">
        <h2 id="trials-heading" className="text-sm font-semibold text-primary">
          Trials
        </h2>
        {trials.length === 0 ? (
          <p className="text-sm text-tertiary">No trials found in your emails.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {trials.map((trial) => (
              <TrialCard key={trial.slug} trial={trial} onSaved={() => void sync()} readOnly={readOnly} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
