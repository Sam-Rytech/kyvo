import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="rounded-xl border border-secondary bg-primary p-2xl text-center shadow-xs max-w-md mx-auto">
      <h1 className="text-heading-xs font-semibold text-primary">That page doesn&apos;t exist</h1>
      <p className="text-sm text-secondary mt-xs">The link may be old, or a shared report may no longer be available.</p>
      <Link href="/" className="inline-block mt-md rounded-lg bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand">
        Go to Kyvo
      </Link>
    </div>
  );
}
