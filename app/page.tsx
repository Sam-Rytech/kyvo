import { eq } from 'drizzle-orm';
import { DashboardView } from '@/components/dashboard-view';
import { SampleDashboard } from '@/components/sample-dashboard';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getSession } from '@/lib/auth/session';
import { getTatum } from '@/lib/chain/tatum-client';
import { today } from '@/lib/engines/dates';
import { guardAlerts } from '@/lib/engines/decline-guard';
import { blankForecasts, buildFunding } from '@/lib/engines/forecast';
import { buildHindcast } from '@/lib/engines/hindcast';
import { merchantHistories } from '@/lib/engines/history';
import { promiseStates } from '@/lib/engines/promises';
import { trialStates } from '@/lib/engines/trials';
import { getUsdcRate, type Rate } from '@/lib/fx/tatum-rates';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return <SampleDashboard />;

  const db = createDb();
  const [events, [user]] = await Promise.all([
    db.select().from(cacheEvents).where(eq(cacheEvents.userId, session.userId)),
    db.select().from(users).where(eq(users.id, session.userId)),
  ]);
  const currency = user?.homeCurrency ?? 'NGN';
  const asOf = today();

  let rate: Rate | null = null;
  if (currency !== 'USD') {
    try {
      rate = await getUsdcRate(getTatum(), currency);
    } catch {
      rate = null; // The page says amounts are in dollars rather than showing a wrong local figure.
    }
  }

  return (
    <DashboardView
      funding={buildFunding(events, currency, asOf)}
      blank={blankForecasts(merchantHistories(events, currency), asOf)}
      hindcast={buildHindcast(events, currency, asOf)}
      alerts={guardAlerts(events, currency, asOf)}
      trials={trialStates(events, asOf)}
      promises={promiseStates(events, asOf)}
      rate={rate?.value ?? null}
      rateSource={rate?.source ?? null}
      currency={currency}
      hasMemories={events.length > 0}
    />
  );
}
