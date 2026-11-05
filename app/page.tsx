import { eq } from 'drizzle-orm';
import { DashboardView } from '@/components/dashboard-view';
import { Landing } from '@/components/landing';
import { createDb } from '@/db';
import { cacheEvents, users } from '@/db/schema';
import { getViewer } from '@/lib/viewer';
import { getTatum } from '@/lib/chain/tatum-client';
import { today } from '@/lib/engines/dates';
import { guardAlerts } from '@/lib/engines/decline-guard';
import { blankForecasts, buildFunding } from '@/lib/engines/forecast';
import { buildHindcast } from '@/lib/engines/hindcast';
import { merchantHistories } from '@/lib/engines/history';
import { promiseStates } from '@/lib/engines/promises';
import { trialStates } from '@/lib/engines/trials';
import { makeLinkCode } from '@/lib/auth/crypto';
import { getVaultUsdcBalance } from '@/lib/chain/usdc';
import { vaultRunway, type VaultRunway } from '@/lib/engines/vault';
import { getUsdcRate, type Rate } from '@/lib/fx/tatum-rates';

export default async function DashboardPage() {
  const viewer = await getViewer();
  const db = createDb();
  const [events, [user]] = await Promise.all([
    db.select().from(cacheEvents).where(eq(cacheEvents.userId, viewer.userId)),
    db.select().from(users).where(eq(users.id, viewer.userId)),
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

  let runway: VaultRunway | null = null;
  let vaultUnavailable = false;
  if (user?.vaultAddress) {
    try {
      runway = vaultRunway(await getVaultUsdcBalance(getTatum(), user.vaultAddress), events, currency, asOf);
    } catch {
      vaultUnavailable = true; // Never shown as an empty vault.
    }
  }
  const bot = process.env.TELEGRAM_BOT_USERNAME ?? 'Kyvoalert_bot';
  const telegramLink = `https://t.me/${bot}?start=${makeLinkCode(viewer.userId, process.env.TOKEN_ENC_KEY as string)}`;

  return (
    <>
    {viewer.readOnly && <div className="mb-xl"><Landing /></div>}
    <DashboardView
      vault={{ address: user?.vaultAddress ?? null, runway, unavailable: vaultUnavailable }}
      telegram={{ linked: Boolean(user?.telegramChatId), linkUrl: telegramLink }}
      readOnly={viewer.readOnly}
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
    </>
  );
}
