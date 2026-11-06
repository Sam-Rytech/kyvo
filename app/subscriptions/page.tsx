import { eq } from 'drizzle-orm';
import { CardsView } from '@/components/cards-view';
import { ScanPanel } from '@/components/scan-panel';
import { SubscriptionsList } from '@/components/subscriptions-view';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getViewer } from '@/lib/viewer';
import { getTatum } from '@/lib/chain/tatum-client';
import { today } from '@/lib/engines/dates';
import { cardStates } from '@/lib/engines/registry';
import { deriveSubscriptions } from '@/lib/engines/subscriptions';
import { getUsdcRate, type Rate } from '@/lib/fx/tatum-rates';

export const metadata = { title: 'Subscriptions · Kyvo' };

export default async function SubscriptionsPage() {
  const viewer = await getViewer();

  const db = createDb();
  const [events, [user]] = await Promise.all([
    db.select().from(cacheEvents).where(eq(cacheEvents.userId, viewer.userId)),
    db.select().from(users).where(eq(users.id, viewer.userId)),
  ]);
  const subscriptions = deriveSubscriptions(events, user?.homeCurrency);

  let rate: Rate | null = null;
  let rateFailed = false;
  const home = user?.homeCurrency ?? 'NGN';
  if (subscriptions.length > 0 && home !== 'USD') {
    try {
      rate = await getUsdcRate(getTatum(), home);
    } catch {
      rateFailed = true;
    }
  }

  return (
    <div className="space-y-2xl">
      <section className="space-y-lg">
        <h1 className="page-title">Subscriptions</h1>

        {!viewer.readOnly && <ScanPanel />}

        {rateFailed && <p className="text-sm text-utility-warning-700">Exchange rates are unavailable right now, so local amounts are hidden.</p>}

        {subscriptions.length === 0 ? <p className="text-md text-secondary border-t border-secondary pt-md">Your dollar subscriptions show up here on their own after a scan.</p> : <SubscriptionsList subscriptions={subscriptions} rate={rate?.value ?? null} currency={home} />}
      </section>

      <CardsView cards={cardStates(events, today())} readOnly={viewer.readOnly} />
    </div>
  );
}
