import { eq } from 'drizzle-orm';
import { WrappedView } from '@/components/wrapped-view';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { makeShareCode } from '@/lib/auth/crypto';
import { today } from '@/lib/engines/dates';
import { buildWrapped, wrappedMonths } from '@/lib/engines/wrapped';
import { getViewer } from '@/lib/viewer';

export const metadata = { title: 'Dollar Wrapped · Kyvo' };

export default async function WrappedPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const viewer = await getViewer();
  const db = createDb();
  const [events, [user]] = await Promise.all([db.select().from(cacheEvents).where(eq(cacheEvents.userId, viewer.userId)), db.select().from(users).where(eq(users.id, viewer.userId))]);
  const currency = user?.homeCurrency ?? 'NGN';
  const asOf = today();

  const months = wrappedMonths(events, currency, asOf);
  const { m } = await searchParams;
  const month = m && months.includes(m) ? m : months[0];
  const report = month ? buildWrapped(events, currency, month, asOf) : null;
  const shareUrl = month ? `https://kyvo-five.vercel.app/wrapped/share/${makeShareCode(viewer.userId, month, process.env.TOKEN_ENC_KEY as string)}` : null;

  return <WrappedView report={report} months={months} shareUrl={shareUrl} />;
}
