'use client';

import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="bg-utility-error-50 border border-utility-error-200 rounded-xl p-xl text-center max-w-lg mx-auto my-12">
      <AlertTriangle className="w-8 h-8 text-fg-error-primary mx-auto mb-sm" />
      <h1 className="text-heading-xs font-semibold text-utility-error-700 mb-xs">Something went wrong</h1>
      <p className="text-sm text-utility-error-700 mb-md">This page couldn&apos;t load. Your data is safe, so try again.</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        Try again
      </button>
    </div>
  );
}
