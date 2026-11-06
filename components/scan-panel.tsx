'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

type Progress = { read: number; found: number; stored: number; open: number };

const wait = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** Keeps calling the scan one batch at a time until the inbox is read and Walrus has everything. */
export function ScanPanel({ autoStart = false, label = 'Scan now' }: { autoStart?: boolean; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; reauth?: boolean } | null>(null);
  const [progress, setProgress] = useState<Progress>({ read: 0, found: 0, stored: 0, open: 0 });
  const running = useRef(false);

  async function run() {
    if (running.current) return;
    running.current = true;
    setState('running');
    setError(null);
    let read = 0;
    let found = 0;
    let failures = 0;

    while (running.current) {
      const response = await fetch('/api/scan', { method: 'POST' }).catch(() => null);
      const body = await response?.json().catch(() => null);

      if (!response?.ok || !body) {
        if (body?.reauth) {
          setError({ message: 'Your Gmail access expired. Sign in again to keep scanning.', reauth: true });
          break;
        }
        // A brief relayer or network problem shouldn't end a long scan.
        if (++failures >= 5) {
          setError({ message: body?.error ?? 'The scan stopped. Your progress is saved, so try again.' });
          break;
        }
        await wait(10);
        continue;
      }
      failures = 0;

      read += body.scan.processed + body.scan.skipped;
      found += body.scan.events;
      setProgress({ read, found, stored: body.outbox.stored, open: body.outbox.open });

      if (body.scan.done && body.outbox.open === 0) {
        setState('done');
        setNote(null);
        router.refresh();
        break;
      }

      if (body.scan.pausedForSeconds) {
        setNote(`Paused for ${body.scan.pausedForSeconds}s: waiting on the free AI quota.`);
        await wait(body.scan.pausedForSeconds);
      } else if (body.scan.done) {
        setNote('Your inbox is read. Saving the last records to Walrus Memory.');
        await wait(15);
      } else {
        setNote(null);
        await wait(8);
      }
    }
    running.current = false;
    setState((current) => (current === 'running' ? 'idle' : current));
  }

  useEffect(() => {
    if (autoStart) void run();
    return () => {
      running.current = false;
    };
    // Starts once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border-y border-secondary py-md space-y-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="min-w-0" role="status">
          {state === 'idle' && <p className="text-sm text-secondary">Read your billing emails and save what Kyvo learns to Walrus Memory.</p>}
          {state === 'running' && (
            <p className="text-sm font-medium text-primary">
              Read {progress.read} emails, found {progress.found} billing events. Syncing to Walrus: {progress.stored} saved, {progress.open} to go.
            </p>
          )}
          {state === 'done' && (
            <p className="text-sm font-medium text-primary">
              Done. {progress.stored} records saved to Walrus Memory.
            </p>
          )}
          {note && <p className="text-xs text-tertiary mt-xxs">{note}</p>}
        </div>
        {state !== 'running' && (
          <button
            onClick={() => void run()}
            className="inline-flex items-center gap-xs rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {label}
          </button>
        )}
        {state === 'running' && <RefreshCw className="w-4 h-4 text-fg-brand-primary animate-spin shrink-0" aria-hidden />}
      </div>
      {state === 'running' && <p className="text-xs text-tertiary">You can leave this page. Come back and scan again to carry on where it stopped.</p>}
      {error && (
        <p className="text-sm text-utility-error-700">
          {error.message}{' '}
          {error.reauth && (
            <a className="font-semibold underline" href="/api/auth/google">
              Sign in again
            </a>
          )}
        </p>
      )}
    </div>
  );
}
