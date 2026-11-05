'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const POLL_SECONDS = 15;

/** Writes what's pending to Walrus in the background, and refreshes the page once it's stored. */
export function useMemorySync() {
  const router = useRouter();
  const [open, setOpen] = useState(0);
  const running = useRef(false);

  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    let hadWork = false;
    for (let failures = 0; running.current && failures < 4; ) {
      const response = await fetch('/api/sync', { method: 'POST' }).catch(() => null);
      const body = await response?.json().catch(() => null);
      if (!response?.ok || !body) {
        failures++;
      } else {
        failures = 0;
        setOpen(body.open);
        if (body.open === 0) break;
        hadWork = true;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_SECONDS * 1000));
    }
    running.current = false;
    setOpen(0);
    if (hadWork) router.refresh();
  }, [router]);

  useEffect(() => () => {
    running.current = false;
  }, []);

  return { open, sync };
}

export function MemorySyncStatus({ autoStart = true }: { autoStart?: boolean }) {
  const { open, sync } = useMemorySync();

  useEffect(() => {
    if (autoStart) void sync();
  }, [autoStart, sync]);

  if (open === 0) return null;
  return (
    <p role="status" className="flex items-center gap-xs text-xs text-tertiary">
      <RefreshCw className="w-3 h-3 animate-spin shrink-0" aria-hidden />
      Saving {open} {open === 1 ? 'record' : 'records'} to Walrus Memory…
    </p>
  );
}
