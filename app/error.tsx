'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-sm py-xl">
      <h1 className="page-title">Something went wrong</h1>
      <p className="text-md text-secondary">This page couldn&apos;t load. Your data is safe, so try again.</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-sm rounded-full border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        Try again
      </button>
    </div>
  );
}
