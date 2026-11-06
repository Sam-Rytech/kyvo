'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/** Says who can connect before Google opens, rather than on every page. */
export function ConnectGmail({ className, label = 'Connect Gmail' }: { className: string; label?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
          <button aria-label="Close dialog" onClick={() => setOpen(false)} className="absolute inset-0 bg-overlay opacity-70" />
          <div role="dialog" aria-modal="true" aria-labelledby="connect-title" className="relative w-full max-w-md rounded-lg bg-primary p-xl space-y-md text-left">
            <div className="flex items-start justify-between gap-md">
              <h2 id="connect-title" className="section-title">
                Connect your Gmail
              </h2>
              <button onClick={() => setOpen(false)} autoFocus className="p-xs rounded-lg" aria-label="Close">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <p className="text-sm text-secondary">Only approved testers can connect for now, because Kyvo is in Google&apos;s testing mode. Anyone else will see an error from Google and can keep using the demo.</p>
            <p className="text-sm text-secondary">Kyvo reads your billing emails only. Their text goes to Groq to pick out charges, and raw email is never stored.</p>
            <div className="flex flex-wrap gap-xs">
              <a href="/api/auth/google" className="rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand">
                Continue to Google
              </a>
              <button onClick={() => setOpen(false)} className="rounded-full border border-primary px-lg py-sm text-sm font-semibold text-primary">
                Keep using the demo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
