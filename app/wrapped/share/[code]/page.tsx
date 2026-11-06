import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WrappedCard } from '@/components/wrapped-view';
import { loadSharedReport } from '@/lib/wrapped-share';

export const metadata = { title: 'Dollar Wrapped · Kyvo', description: 'A month of dollar subscriptions, forecast by Kyvo.' };

export default async function SharedWrappedPage({ params }: { params: Promise<{ code: string }> }) {
  const report = await loadSharedReport((await params).code);
  if (!report) notFound();

  return (
    <div className="space-y-lg max-w-3xl">
      <WrappedCard report={report} showMerchants={false} />
      <p className="text-center text-sm text-secondary">
        <Link href="/" className="font-semibold text-brand-primary hover:underline">
          See how Kyvo works
        </Link>
      </p>
    </div>
  );
}
