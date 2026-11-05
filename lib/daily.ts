// The daily run (architecture §3): scan → engines → notify. Vercel can miss or repeat a cron
// call and never retries, so every step is safe to run twice and one user's failure stays theirs.
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { cacheEvents, outbox, tokens, users } from '@/db/schema';
import { decryptToken } from '@/lib/auth/crypto';
import { ReauthRequiredError, refreshAccessToken } from '@/lib/auth/google';
import { getTatum } from '@/lib/chain/tatum-client';
import { getVaultTransactions } from '@/lib/chain/usdc';
import { today } from '@/lib/engines/dates';
import { matchPayments, paymentMemories, planStates } from '@/lib/engines/family';
import { pendingForecastMemories } from '@/lib/engines/hindcast';
import { buildNotifications } from '@/lib/engines/notify';
import { getUsdcRate } from '@/lib/fx/tatum-rates';
import { createExtractor } from '@/lib/inbox/extractor';
import { createGmailClient } from '@/lib/inbox/gmail';
import { scanBatch } from '@/lib/inbox/scan';
import { postgresScanStore } from '@/lib/inbox/scan-store';
import { getMemWal } from '@/lib/memory/client';
import { drainOnce } from '@/lib/memory/drainer';
import { enqueue, postgresDrainStore } from '@/lib/memory/store';
import { deliver } from '@/lib/telegram/send';

const SITE = 'https://kyvo-five.vercel.app';
const MAX_SCAN_BATCHES = 4;
const DRAIN_PAUSE_MS = 10_000;

type Clock = { deadline: number; now: () => number };

/** Checks the vault for payments and queues any that match. Used by the cron and the Family page. */
export async function checkFamilyPayments(db: Db, userId: string, vault: string, asOf: string = today()) {
  const events = await db.select().from(cacheEvents).where(eq(cacheEvents.userId, userId));
  const plans = planStates(events, asOf, vault);
  if (plans.length === 0) return { matched: [], unmatched: [] };
  const result = matchPayments(plans, await getVaultTransactions(getTatum(), vault));
  await enqueue(db, paymentMemories(userId, result.matched));
  return result;
}

async function scanUser(db: Db, userId: string, homeCurrency: string, refreshTokenEnc: string, clock: Clock) {
  const accessToken = await refreshAccessToken(decryptToken(refreshTokenEnc, process.env.TOKEN_ENC_KEY as string));
  const deps = { store: postgresScanStore(db), gmail: createGmailClient(accessToken), extract: createExtractor(homeCurrency) };
  let events = 0;
  for (let batch = 0; batch < MAX_SCAN_BATCHES && clock.now() < clock.deadline; batch++) {
    const result = await scanBatch(deps, userId);
    events += result.events;
    if (result.done || result.pausedForSeconds) break;
  }
  return events;
}

export type DailySummary = { users: number; scanned: number; newEvents: number; payments: number; needReauth: number; stored: number; open: number; sent: number; skipped: number; failed: number; errors: number };

export async function runDaily(db: Db, options: { budgetMs: number; now?: () => number; sleep?: (ms: number) => Promise<void> }): Promise<DailySummary> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const started = now();
  const summary: DailySummary = { users: 0, scanned: 0, newEvents: 0, payments: 0, needReauth: 0, stored: 0, open: 0, sent: 0, skipped: 0, failed: 0, errors: 0 };
  const asOf = today(started);

  const everyone = await db.select().from(users);
  const allTokens = await db.select().from(tokens);
  summary.users = everyone.length;
  const reauth = new Set<string>();

  // Scanning gets at most 40% of the run, so a slow inbox can't crowd out the alerts.
  const scanClock: Clock = { deadline: started + options.budgetMs * 0.4, now };
  for (const user of everyone) {
    const token = allTokens.find((t) => t.userId === user.id);
    if (!token || now() >= scanClock.deadline) continue;
    try {
      summary.newEvents += await scanUser(db, user.id, user.homeCurrency, token.refreshTokenEnc, scanClock);
      summary.scanned++;
    } catch (error) {
      if (error instanceof ReauthRequiredError) reauth.add(user.id);
      else summary.errors++;
      console.error('daily scan failed:', (error as Error).name);
    }
  }
  summary.needReauth = reauth.size;

  for (const user of everyone) {
    try {
      if (user.vaultAddress) summary.payments += (await checkFamilyPayments(db, user.id, user.vaultAddress, asOf)).matched.length;
      const events = await db.select().from(cacheEvents).where(eq(cacheEvents.userId, user.id));
      await enqueue(db, pendingForecastMemories(events, user.id, user.homeCurrency, asOf).map(({ userId, namespace, text, idempotencyKey }) => ({ userId, namespace, text, idempotencyKey })));
    } catch (error) {
      summary.errors++;
      console.error('daily engines failed:', (error as Error).name);
    }
  }

  // Writes are paced for the whole account, so Hobby's single daily run drains what it can.
  const store = postgresDrainStore(db);
  const memory = getMemWal();
  const drainDeadline = started + options.budgetMs * 0.85;
  let open = 1;
  while (open > 0 && now() < drainDeadline) {
    const result = await drainOnce(store, memory, new Date(now())).catch((error) => {
      console.error('daily drain failed:', (error as Error).name);
      return { stored: 0 };
    });
    summary.stored += result.stored;
    const [counts] = await db.select({ n: sql<number>`count(*) filter (where ${outbox.status} in ('pending','sending','submitted'))::int` }).from(outbox);
    open = counts.n;
    if (open > 0) await sleep(DRAIN_PAUSE_MS);
  }
  summary.open = open;

  const linked = await db.select().from(users).where(and(isNotNull(users.telegramChatId)));
  for (const user of linked) {
    try {
      const events = await db.select().from(cacheEvents).where(eq(cacheEvents.userId, user.id));
      let rate: number | null = null;
      if (user.homeCurrency !== 'USD') rate = await getUsdcRate(getTatum(), user.homeCurrency).then((r) => r.value).catch(() => null);
      const list = buildNotifications({ events, homeCurrency: user.homeCurrency, asOf, rate, vault: user.vaultAddress ?? undefined });
      if (reauth.has(user.id)) {
        // Google ends Testing-mode logins after about 7 days (§13), so this can recur weekly.
        list.unshift({ key: `reauth:${asOf.slice(0, 7)}:${Math.floor(Number(asOf.slice(8)) / 7)}`, text: `🔌 Kyvo lost access to your Gmail, which happens about weekly while the app is in testing. Reconnect at ${SITE}/api/auth/google so nothing gets missed.` });
      }
      const result = await deliver(db, user.id, user.telegramChatId as string, list);
      summary.sent += result.sent;
      summary.skipped += result.skipped;
      summary.failed += result.failed;
    } catch (error) {
      summary.errors++;
      console.error('daily notify failed:', (error as Error).name);
    }
  }
  return summary;
}
