'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RefreshCw } from 'lucide-react';
import { ConnectGmail } from '@/components/connect-gmail';

type Recall = { state: 'idle' } | { state: 'confirm' } | { state: 'running'; done: number; total: number; restored: number } | { state: 'done'; restored: number } | { state: 'error'; message: string };

export function TotalRecall({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [recall, setRecall] = useState<Recall>({ state: 'idle' });

  async function run() {
    setRecall({ state: 'running', done: 0, total: 0, restored: 0 });
    let cursor = 0;
    let restored = 0;
    for (;;) {
      const response = await fetch('/api/rebuild', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cursor }) }).catch(() => null);
      const body = await response?.json().catch(() => null);
      if (!response?.ok || !body) {
        setRecall({ state: 'error', message: body?.error ?? 'Total Recall stopped. Your memories are safe on Walrus, so try again.' });
        return;
      }
      restored += body.restored;
      cursor = body.cursor;
      if (body.done) {
        setRecall({ state: 'done', restored });
        router.refresh();
        return;
      }
      setRecall({ state: 'running', done: cursor, total: body.total, restored });
    }
  }

  const button = 'rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand';

  return (
    <section className="border-t border-secondary pt-xl space-y-sm" aria-labelledby="recall-title">
      <h2 id="recall-title" className="section-title">
        Total Recall
      </h2>
      <p className="text-sm text-secondary max-w-prose">This wipes Kyvo&apos;s database copy of an account and rebuilds it from Walrus Memory alone. Nothing on Walrus changes, and the same list comes back. That&apos;s how you know Walrus is the source of truth.</p>

      {!signedIn && <ConnectGmail className={button} label="Connect Gmail to try it" />}
      {signedIn && (recall.state === 'idle' || recall.state === 'done' || recall.state === 'error') && (
        <button onClick={() => setRecall({ state: 'confirm' })} className={button}>
          Wipe and rebuild
        </button>
      )}
      {recall.state === 'confirm' && (
        <div className="flex flex-wrap items-center gap-xs">
          <p className="text-sm font-semibold text-primary">Wipe your copy and rebuild it now?</p>
          <button onClick={() => void run()} className={button}>
            Yes, wipe and rebuild
          </button>
          <button onClick={() => setRecall({ state: 'idle' })} className="rounded-full border border-primary px-lg py-sm text-sm font-semibold text-primary">
            Cancel
          </button>
        </div>
      )}
      {recall.state === 'running' && (
        <p role="status" className="flex items-center gap-xs text-sm font-semibold text-primary">
          <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden />
          {recall.total ? `Recalled ${recall.done} of ${recall.total} namespaces, ${recall.restored} records so far` : 'Reading from Walrus Memory…'}
        </p>
      )}
      {recall.state === 'done' && (
        <p role="status" className="flex items-center gap-xs text-sm font-semibold text-primary">
          <Check className="w-4 h-4" aria-hidden />
          Rebuilt {recall.restored} records from Walrus Memory.
        </p>
      )}
      {recall.state === 'error' && (
        <p role="alert" className="text-sm text-utility-error-700">
          {recall.message}
        </p>
      )}
    </section>
  );
}
