import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="space-y-sm py-xl">
      <h1 className="page-title">That page doesn&apos;t exist</h1>
      <p className="text-md text-secondary">The link may be old, or a shared report may no longer be available.</p>
      <Link href="/" className="inline-block rounded-full bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand">
        Go to Kyvo
      </Link>
    </div>
  );
}
